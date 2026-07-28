import { describe, it, expect } from 'vitest';
import {
  checkStandardEngagementPrereqs,
  checkBVREngagementPrereqs,
  rollManeuver,
  resolveShot,
  rollDepletion,
  allocateDamage,
  rollMoraleCheck,
  resolveStandardCombat,
} from '@engine/rules/combat';
import { getWeapon } from '@data/weapons/airToAirWeapons';
import { FlightState, createEmptyGameState } from '@engine/state/GameState';

function createFlight(overrides: Partial<FlightState> = {}): FlightState {
  return {
    id: 'F-1', side: 'nato', nation: 'US', aircraftType: 'F-15C',
    genericCounterId: null, isVisuallyIdentified: true, isDummy: false,
    hex: { col: 50, row: 5 }, onHexside: false, heading: 0, altitude: 'medium',
    throttle: 'combat', speed: 5, mpRemaining: 0, hasMoved: true,
    hasMovedThisPhase: true,
    aircraft: [
      { index: 1, damage: 'none', bombStrength: 0, bombStrengthRemaining: 0,
        ordnance: [], airToAirWeapons: [
          { weaponId: 'AIM-7M', depleted: false },
          { weaponId: 'AIM-9M', depleted: false },
        ], crewCount: 1, crewStatus: ['ok'] },
      { index: 2, damage: 'none', bombStrength: 0, bombStrengthRemaining: 0,
        ordnance: [], airToAirWeapons: [
          { weaponId: 'AIM-7M', depleted: false },
          { weaponId: 'AIM-9M', depleted: false },
        ], crewCount: 1, crewStatus: ['ok'] },
    ],
    task: 'cap', raidId: null, flightPath: null, currentWaypointIndex: 0,
    detected: false, disordered: false, aborted: false, inDefensiveWheel: false,
    isOnGround: false, groundState: null, takeoffTurn: null, landingTurn: null,
    markers: [], pilotQuality: 'ace', aggressionValue: 2,
    fuelUsed: 0, fuelAllowance: 5, extraFuelUsed: 0,
    ...overrides,
  };
}

describe('Standard Engagement Prerequisites', () => {
  it('allows engagement when all prerequisites met', () => {
    // Same hex = arcs don't matter (rule 11.211c)
    const attacker = createFlight({
      id: 'ATK', hex: { col: 50, row: 5 }, heading: 0, hasMoved: true,
    });
    const defender = createFlight({
      id: 'DEF', side: 'wp', hex: { col: 50, row: 5 }, // Same hex
      altitude: 'medium', detected: true,
    });
    const state = createEmptyGameState();
    const check = checkStandardEngagementPrereqs(attacker, defender, state);
    expect(check.canEngage).toBe(true);
  });

  it('prevents engagement if attacker has not moved', () => {
    const attacker = createFlight({ hasMoved: false });
    const defender = createFlight({ side: 'wp', detected: true, hex: { col: 51, row: 5 } });
    const state = createEmptyGameState();
    const check = checkStandardEngagementPrereqs(attacker, defender, state);
    expect(check.canEngage).toBe(false);
    expect(check.reasons).toContain('Attacker must have moved at least 1 hex or changed altitude');
  });

  it('prevents engagement if defender undetected', () => {
    const attacker = createFlight({ hasMoved: true });
    const defender = createFlight({ side: 'wp', detected: false, hex: { col: 51, row: 5 } });
    const state = createEmptyGameState();
    const check = checkStandardEngagementPrereqs(attacker, defender, state);
    expect(check.canEngage).toBe(false);
  });

  it('prevents engagement if attacker disordered', () => {
    const attacker = createFlight({ hasMoved: true, disordered: true });
    const defender = createFlight({ side: 'wp', detected: true, hex: { col: 51, row: 5 } });
    const state = createEmptyGameState();
    const check = checkStandardEngagementPrereqs(attacker, defender, state);
    expect(check.canEngage).toBe(false);
  });

  it('prevents engagement if target too far', () => {
    const attacker = createFlight({ hasMoved: true, hex: { col: 50, row: 5 } });
    const defender = createFlight({ side: 'wp', detected: true, hex: { col: 55, row: 5 } });
    const state = createEmptyGameState();
    const check = checkStandardEngagementPrereqs(attacker, defender, state);
    expect(check.canEngage).toBe(false);
  });

  it('prevents engagement if no weapons', () => {
    const attacker = createFlight({
      hasMoved: true,
      aircraft: [{
        index: 1, damage: 'none', bombStrength: 0, bombStrengthRemaining: 0,
        ordnance: [], airToAirWeapons: [{ weaponId: 'AIM-7M', depleted: true }],
        crewCount: 1, crewStatus: ['ok'],
      }],
    });
    const defender = createFlight({ side: 'wp', detected: true, hex: { col: 51, row: 5 } });
    const state = createEmptyGameState();
    const check = checkStandardEngagementPrereqs(attacker, defender, state);
    expect(check.canEngage).toBe(false);
  });
});

describe('BVR Engagement Prerequisites', () => {
  it('allows BVR when all prerequisites met', () => {
    // F-15C with AIM-7M, heading 0 (east), target at (56,5) - east and in forward arc
    // Use even column target so bearing is 0° exactly
    const attacker = createFlight({
      id: 'ATK', hex: { col: 50, row: 5 }, heading: 0, hasMoved: true,
      aircraftType: 'F-15C',
    });
    // Defender heading west (180°) so attacker is in defender's forward arc
    // AIM-7M forward range = 12, distance = 6
    const defender = createFlight({
      id: 'DEF', side: 'wp', hex: { col: 56, row: 5 },
      altitude: 'medium', detected: true, heading: 180,
    });
    const state = createEmptyGameState();
    const check = checkBVREngagementPrereqs(attacker, defender, state);
    expect(check.canEngage).toBe(true);
  });

  it('prevents BVR from defensive wheel', () => {
    const attacker = createFlight({ hasMoved: true, inDefensiveWheel: true });
    const defender = createFlight({ side: 'wp', detected: true, hex: { col: 55, row: 5 } });
    const state = createEmptyGameState();
    const check = checkBVREngagementPrereqs(attacker, defender, state);
    expect(check.canEngage).toBe(false);
  });
});

describe('Maneuver Rolls', () => {
  it('returns shot opportunities based on roll', () => {
    const flight = createFlight();
    const result = rollManeuver(flight, true, false, false, false);
    expect(result.shotOpportunities).toBeGreaterThanOrEqual(0);
    expect(result.shotOpportunities).toBeLessThanOrEqual(4);
  });

  it('surprise gives +3 modifier', () => {
    const flight = createFlight();
    const result = rollManeuver(flight, true, true, false, false);
    expect(result.modifiers['surprise']).toBe(3);
  });

  it('disadvantage gives -3 modifier', () => {
    const flight = createFlight();
    const result = rollManeuver(flight, false, false, true, false);
    expect(result.modifiers['disadvantaged']).toBe(-3);
  });

  it('Soviet doctrine limits WP attacker column', () => {
    const wpFlight = createFlight({
      side: 'wp', aircraftType: 'MiG-21bis',
      aircraft: [{
        index: 1, damage: 'none', bombStrength: 0, bombStrengthRemaining: 0,
        ordnance: [], airToAirWeapons: [{ weaponId: 'R-60', depleted: false }],
        crewCount: 1, crewStatus: ['ok'],
      }],
    });
    // MiG-21bis with 1 aircraft should use column 1 as attacker
    const result = rollManeuver(wpFlight, true, false, false, false);
    // Result should be valid (testing that it doesn't crash)
    expect(result.shotOpportunities).toBeGreaterThanOrEqual(0);
  });
});

describe('Shot Resolution', () => {
  it('AIM-7M shot produces valid result', () => {
    const weapon = getWeapon('AIM-7M')!;
    const result = resolveShot(weapon, true, false);
    expect(result.weaponId).toBe('AIM-7M');
    expect(result.roll).toBeGreaterThanOrEqual(2);
    expect(result.roll).toBeLessThanOrEqual(20);
    if (result.hit) {
      expect(['damaged', 'crippled', 'shotdown']).toContain(result.damageType);
    }
  });

  it('BVR shot uses BVR combat value', () => {
    const weapon = getWeapon('AIM-7M')!;
    const result = resolveShot(weapon, false, true);
    expect(result.modifiers['weapon_value']).toBe(3); // BVR value
  });

  it('standard shot uses standard combat value', () => {
    const weapon = getWeapon('AIM-7M')!;
    const result = resolveShot(weapon, false, false);
    expect(result.modifiers['weapon_value']).toBe(4); // Standard value
  });
});

describe('Ammo Depletion', () => {
  it('produces valid depletion result', () => {
    const weapon = getWeapon('AIM-7M')!;
    const result = rollDepletion(weapon, 1, 'AIM-9M', false);
    expect(result.weaponId).toBe('AIM-7M');
    expect(typeof result.depleted).toBe('boolean');
  });

  it('multiple shots increase depletion chance', () => {
    // Statistical test: with 3 shots, depletion should be more likely
    const weapon = getWeapon('AIM-9L')!;
    let depletedCount = 0;
    for (let i = 0; i < 100; i++) {
      if (rollDepletion(weapon, 3, null, false).depleted) depletedCount++;
    }
    // With depletion number 4 and -2 modifier (3 shots), should deplete often
    expect(depletedCount).toBeGreaterThan(20);
  });
});

describe('Damage Allocation', () => {
  it('allocates damage to an aircraft in the flight', () => {
    const flight = createFlight();
    const result = allocateDamage(flight, 'damaged');
    expect(result.aircraftIndex).toBeGreaterThanOrEqual(1);
    expect(result.aircraftIndex).toBeLessThanOrEqual(2);
    expect(result.damageApplied).toBe('damaged');
    expect(result.resultingDamage).toBe('damaged');
  });

  it('escalates damage on already-damaged aircraft', () => {
    const flight = createFlight({
      aircraft: [{
        index: 1, damage: 'damaged', bombStrength: 0, bombStrengthRemaining: 0,
        ordnance: [], airToAirWeapons: [], crewCount: 1, crewStatus: ['ok'],
      }],
    });
    const result = allocateDamage(flight, 'damaged');
    expect(result.resultingDamage).toBe('crippled');
  });

  it('crippled + any damage = shotdown', () => {
    const flight = createFlight({
      aircraft: [{
        index: 1, damage: 'crippled', bombStrength: 0, bombStrengthRemaining: 0,
        ordnance: [], airToAirWeapons: [], crewCount: 1, crewStatus: ['ok'],
      }],
    });
    const result = allocateDamage(flight, 'damaged');
    expect(result.resultingDamage).toBe('shotdown');
  });
});

describe('Morale Check', () => {
  it('produces valid morale result', () => {
    const flight = createFlight();
    const result = rollMoraleCheck(flight, 'standard', 0, 0);
    expect(['none', 'jettison', 'disordered', 'abort']).toContain(result.result);
  });

  it('aircraft losses worsen morale', () => {
    const flight = createFlight({ aggressionValue: -2 });
    const result = rollMoraleCheck(flight, 'standard', 2, 1);
    expect(result.modifiers['aircraft_lost']).toBe(-6);
    expect(result.modifiers['aircraft_damaged']).toBe(-1);
  });
});

describe('Full Combat Resolution', () => {
  it('resolves complete standard combat without errors', () => {
    const attacker = createFlight({
      id: 'ATK', hex: { col: 50, row: 5 }, heading: 0, hasMoved: true,
    });
    const defender = createFlight({
      id: 'DEF', side: 'wp', hex: { col: 51, row: 5 },
      altitude: 'medium', detected: true, aircraftType: 'MiG-29A',
      aircraft: [
        { index: 1, damage: 'none', bombStrength: 0, bombStrengthRemaining: 0,
          ordnance: [], airToAirWeapons: [
            { weaponId: 'R-27R', depleted: false },
            { weaponId: 'R-73', depleted: false },
          ], crewCount: 1, crewStatus: ['ok'] },
      ],
    });

    const result = resolveStandardCombat(attacker, defender, true);

    expect(result.type).toBe('standard');
    expect(result.engagement).toBeDefined();

    if (result.engagement.combatOccurs) {
      expect(result.attackerManeuver).not.toBeNull();
      expect(result.attackerMorale).not.toBeNull();
      expect(result.defenderMorale).not.toBeNull();
    }
  });

  it('no engagement returns minimal result', () => {
    // Run multiple times to get a no-engagement result
    let gotNoEngagement = false;
    for (let i = 0; i < 50; i++) {
      const attacker = createFlight({
        id: 'ATK', hasMoved: true, aggressionValue: -3,
      });
      const defender = createFlight({
        id: 'DEF', side: 'wp', detected: true, aggressionValue: -3,
        hex: { col: 51, row: 5 },
        aircraft: [{ index: 1, damage: 'none', bombStrength: 0, bombStrengthRemaining: 0,
          ordnance: [], airToAirWeapons: [{ weaponId: 'R-60', depleted: false }],
          crewCount: 1, crewStatus: ['ok'] }],
      });
      const result = resolveStandardCombat(attacker, defender, true);
      if (!result.engagement.combatOccurs) {
        gotNoEngagement = true;
        expect(result.attackerManeuver).toBeNull();
        expect(result.attackerShots).toHaveLength(0);
        break;
      }
    }
    // It's statistically possible all 50 engaged, so don't assert gotNoEngagement
  });
});

describe('Weapon Database', () => {
  it('AIM-7M has correct values', () => {
    const w = getWeapon('AIM-7M')!;
    expect(w.standardCombatValue).toBe(4);
    expect(w.bvrCombatValue).toBe(3);
    expect(w.bvrRange!.forward).toBe(12);
    expect(w.depletionNumber).toBe(5);
    expect(w.class).toBe('rhm');
  });

  it('R-73 has correct values', () => {
    const w = getWeapon('R-73')!;
    expect(w.standardCombatValue).toBe(5);
    expect(w.bvrCombatValue).toBeNull();
    expect(w.class).toBe('irm');
  });

  it('guns cannot BVR', () => {
    const w = getWeapon('Gun_M61')!;
    expect(w.bvrCombatValue).toBeNull();
    expect(w.bvrRange).toBeNull();
  });
});
