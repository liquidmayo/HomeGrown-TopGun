import { describe, it, expect } from 'vitest';
import {
  getDefensiveJamStrength,
  getDefensiveJamType,
  isBurnThrough,
  getStandoffJamStrength,
  isInJammerArc,
  calculateTotalStandoffJamming,
  canPlaceStandoffJammer,
  shouldRemoveStandoffJammer,
  canSpotJam,
  isInChaffCorridor,
  canLayChaff,
  createChaffCorridor,
  rollEarlyWarningJamming,
  applyDetectionLevelReduction,
  StandoffJammer,
  ChaffCorridor,
} from '@engine/rules/ecm';
import { FlightState, GroundUnitState, createEmptyGameState } from '@engine/state/GameState';

function createFlight(overrides: Partial<FlightState> = {}): FlightState {
  return {
    id: 'F-1', side: 'nato', nation: 'US', aircraftType: 'F-15C',
    genericCounterId: null, isVisuallyIdentified: false, isDummy: false,
    hex: { col: 50, row: 5 }, onHexside: false, heading: 0, altitude: 'medium',
    throttle: 'combat', speed: 5, mpRemaining: 3, hasMoved: true,
    hasMovedThisPhase: false,
    aircraft: [
      { index: 1, damage: 'none', bombStrength: 0, bombStrengthRemaining: 0,
        ordnance: [], airToAirWeapons: [], crewCount: 1, crewStatus: ['ok'] },
      { index: 2, damage: 'none', bombStrength: 0, bombStrengthRemaining: 0,
        ordnance: [], airToAirWeapons: [], crewCount: 1, crewStatus: ['ok'] },
    ],
    task: 'cap', raidId: null, flightPath: null, currentWaypointIndex: 0,
    detected: false, disordered: false, aborted: false, inDefensiveWheel: false,
    isOnGround: false, groundState: null, takeoffTurn: null, landingTurn: null,
    markers: [], pilotQuality: 'veteran', aggressionValue: 0,
    fuelUsed: 0, fuelAllowance: 5, extraFuelUsed: 0,
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

describe('Defensive Jamming', () => {
  it('F-15C has deception jammer strength 3', () => {
    const flight = createFlight({ aircraftType: 'F-15C' });
    expect(getDefensiveJamStrength(flight)).toBe(3);
    expect(getDefensiveJamType(flight)).toBe('deception');
  });

  it('MiG-21bis has no jammer', () => {
    const flight = createFlight({ aircraftType: 'MiG-21bis' });
    expect(getDefensiveJamStrength(flight)).toBe(0);
    expect(getDefensiveJamType(flight)).toBeNull();
  });

  it('maneuver marker removes jamming', () => {
    const flight = createFlight({ aircraftType: 'F-15C', markers: ['maneuver'] });
    expect(getDefensiveJamStrength(flight)).toBe(0);
  });

  it('anti-radar tactics removes jamming', () => {
    const flight = createFlight({ aircraftType: 'F-15C', markers: ['antiRadarTactics'] });
    expect(getDefensiveJamStrength(flight)).toBe(0);
  });
});

describe('SAM Burn-Through', () => {
  it('noise jammer loses effectiveness within 2 hexes', () => {
    // F-4E has noise jammer
    const flight = createFlight({ aircraftType: 'F-4E', hex: { col: 59, row: 5 } });
    const samHex = { col: 60, row: 5 };
    expect(isBurnThrough(flight, samHex)).toBe(true);
  });

  it('deception jammer is never burned through', () => {
    // F-15C has deception jammer
    const flight = createFlight({ aircraftType: 'F-15C', hex: { col: 59, row: 5 } });
    const samHex = { col: 60, row: 5 };
    expect(isBurnThrough(flight, samHex)).toBe(false);
  });

  it('noise jammer works beyond burn-through range', () => {
    const flight = createFlight({ aircraftType: 'F-4E', hex: { col: 55, row: 5 } });
    const samHex = { col: 60, row: 5 };
    expect(isBurnThrough(flight, samHex)).toBe(false);
  });
});

describe('Standoff Jamming', () => {
  const jammer: StandoffJammer = {
    flightId: 'JAM-1',
    hex: { col: 40, row: 5 },
    arcDirection: 0, // Pointing east
    strength: 3,
    maxRange: 30,
    hasSpotJamming: true,
    spotTargets: [],
  };

  it('strength decreases with range', () => {
    const close = getStandoffJamStrength(jammer, { col: 45, row: 5 }, 2); // ~5 hexes
    const far = getStandoffJamStrength(jammer, { col: 65, row: 5 }, 2);   // ~25 hexes
    expect(close).toBeGreaterThan(far);
  });

  it('strength multiplied by aircraft count', () => {
    const one = getStandoffJamStrength(jammer, { col: 45, row: 5 }, 1);
    const two = getStandoffJamStrength(jammer, { col: 45, row: 5 }, 2);
    expect(two).toBe(one * 2);
  });

  it('returns 0 beyond max range', () => {
    const strength = getStandoffJamStrength(
      { ...jammer, maxRange: 5 },
      { col: 55, row: 5 }, // Beyond range
      2
    );
    expect(strength).toBe(0);
  });
});

describe('Total Standoff Jamming', () => {
  it('caps at 6 for normal radars', () => {
    const sam = createSAM();
    const jammers: StandoffJammer[] = [
      { flightId: 'J1', hex: { col: 40, row: 5 }, arcDirection: 0, strength: 5,
        maxRange: 30, hasSpotJamming: false, spotTargets: [] },
      { flightId: 'J2', hex: { col: 42, row: 5 }, arcDirection: 0, strength: 5,
        maxRange: 30, hasSpotJamming: false, spotTargets: [] },
    ];
    const flights: Record<string, FlightState> = {
      'J1': createFlight({ id: 'J1', hex: { col: 40, row: 5 } }),
      'J2': createFlight({ id: 'J2', hex: { col: 42, row: 5 } }),
    };

    const total = calculateTotalStandoffJamming(sam, jammers, flights, false);
    expect(total).toBeLessThanOrEqual(6);
  });

  it('caps at 3 for phased array radars', () => {
    const sam = createSAM({ subType: 'Patriot' });
    const jammers: StandoffJammer[] = [
      { flightId: 'J1', hex: { col: 40, row: 5 }, arcDirection: 0, strength: 5,
        maxRange: 30, hasSpotJamming: false, spotTargets: [] },
    ];
    const flights: Record<string, FlightState> = {
      'J1': createFlight({ id: 'J1', hex: { col: 40, row: 5 } }),
    };

    const total = calculateTotalStandoffJamming(sam, jammers, flights, true);
    expect(total).toBeLessThanOrEqual(3);
  });

  it('spot jamming doubles strength against specific target', () => {
    const sam = createSAM();
    // Use strength 1 so doubling stays under the cap of 6
    const jammer: StandoffJammer = {
      flightId: 'J1', hex: { col: 55, row: 5 }, arcDirection: 0, strength: 1,
      maxRange: 30, hasSpotJamming: true, spotTargets: ['SAM-1'],
    };
    const flights: Record<string, FlightState> = {
      // Single aircraft so strength = 1 * 1 = 1 (without spot) or 2 (with spot)
      'J1': createFlight({
        id: 'J1', hex: { col: 55, row: 5 },
        aircraft: [{ index: 1, damage: 'none', bombStrength: 0, bombStrengthRemaining: 0,
          ordnance: [], airToAirWeapons: [], crewCount: 1, crewStatus: ['ok'] }],
      }),
    };

    const withSpot = calculateTotalStandoffJamming(sam, [jammer], flights, false);
    const withoutSpot = calculateTotalStandoffJamming(
      sam,
      [{ ...jammer, spotTargets: [] }],
      flights,
      false
    );
    expect(withSpot).toBe(withoutSpot * 2);
  });
});

describe('Standoff Jammer Placement', () => {
  it('standoff jamming flight at Medium can place', () => {
    const flight = createFlight({
      task: 'standoffJamming', altitude: 'medium',
    });
    expect(canPlaceStandoffJammer(flight).canPlace).toBe(true);
  });

  it('cannot place at Low altitude', () => {
    const flight = createFlight({
      task: 'standoffJamming', altitude: 'low',
    });
    expect(canPlaceStandoffJammer(flight).canPlace).toBe(false);
  });

  it('cannot place if disordered', () => {
    const flight = createFlight({
      task: 'standoffJamming', altitude: 'medium', disordered: true,
    });
    expect(canPlaceStandoffJammer(flight).canPlace).toBe(false);
  });

  it('cannot place with damaged aircraft', () => {
    const flight = createFlight({
      task: 'standoffJamming', altitude: 'medium',
      aircraft: [{ index: 1, damage: 'damaged', bombStrength: 0, bombStrengthRemaining: 0,
        ordnance: [], airToAirWeapons: [], crewCount: 1, crewStatus: ['ok'] }],
    });
    expect(canPlaceStandoffJammer(flight).canPlace).toBe(false);
  });

  it('CAP flight cannot place standoff jammer', () => {
    const flight = createFlight({ task: 'cap', altitude: 'medium' });
    expect(canPlaceStandoffJammer(flight).canPlace).toBe(false);
  });
});

describe('Jammer Removal', () => {
  it('disorder removes jammer', () => {
    const flight = createFlight({ disordered: true });
    expect(shouldRemoveStandoffJammer(flight).remove).toBe(true);
  });

  it('damage removes jammer', () => {
    const flight = createFlight({
      aircraft: [{ index: 1, damage: 'damaged', bombStrength: 0, bombStrengthRemaining: 0,
        ordnance: [], airToAirWeapons: [], crewCount: 1, crewStatus: ['ok'] }],
    });
    expect(shouldRemoveStandoffJammer(flight).remove).toBe(true);
  });

  it('healthy flight keeps jammer', () => {
    const flight = createFlight();
    expect(shouldRemoveStandoffJammer(flight).remove).toBe(false);
  });
});

describe('Chaff Corridors', () => {
  it('flight in bloomed chaff corridor at matching altitude is in chaff', () => {
    const flight = createFlight({ hex: { col: 50, row: 5 }, altitude: 'medium' });
    const corridor: ChaffCorridor = {
      hexes: [{ col: 50, row: 5 }, { col: 51, row: 5 }],
      altitude: 'medium',
      placedTurn: 1, bloomedTurn: 3, expiresTurn: 26,
      isBloomed: true,
    };
    expect(isInChaffCorridor(flight, [corridor])).toBe(true);
  });

  it('unbloomed chaff has no effect', () => {
    const flight = createFlight({ hex: { col: 50, row: 5 }, altitude: 'medium' });
    const corridor: ChaffCorridor = {
      hexes: [{ col: 50, row: 5 }],
      altitude: 'medium',
      placedTurn: 1, bloomedTurn: 3, expiresTurn: 26,
      isBloomed: false,
    };
    expect(isInChaffCorridor(flight, [corridor])).toBe(false);
  });

  it('wrong altitude = not in chaff', () => {
    const flight = createFlight({ hex: { col: 50, row: 5 }, altitude: 'high' });
    const corridor: ChaffCorridor = {
      hexes: [{ col: 50, row: 5 }],
      altitude: 'medium',
      placedTurn: 1, bloomedTurn: 3, expiresTurn: 26,
      isBloomed: true,
    };
    expect(isInChaffCorridor(flight, [corridor])).toBe(false);
  });

  it('chaff corridor creation caps at 20 hexes', () => {
    const hexes = Array.from({ length: 25 }, (_, i) => ({ col: 50 + i, row: 5 }));
    const corridor = createChaffCorridor(hexes, 'medium', 3);
    expect(corridor.hexes).toHaveLength(20);
    expect(corridor.bloomedTurn).toBe(5); // placedTurn + 2
    expect(corridor.expiresTurn).toBe(28); // placedTurn + 25
  });

  it('chaff laying requires correct task and altitude', () => {
    const chaffFlight = createFlight({
      task: 'chaffLaying', altitude: 'medium',
      aircraft: [{ index: 1, damage: 'none', bombStrength: 0, bombStrengthRemaining: 0,
        ordnance: [{ type: 'chaff', shotsRemaining: 1, shotsMax: 1 }],
        airToAirWeapons: [], crewCount: 1, crewStatus: ['ok'] }],
    });
    expect(canLayChaff(chaffFlight)).toBe(true);

    // Too low
    const lowFlight = createFlight({
      ...chaffFlight, altitude: 'low',
    });
    expect(canLayChaff(lowFlight)).toBe(false);
  });
});

describe('Early Warning Jamming', () => {
  it('rolls for each aircraft', () => {
    const result = rollEarlyWarningJamming(4);
    expect(result.rolls).toHaveLength(4);
    expect(result.reductions).toBeGreaterThanOrEqual(0);
    expect(result.reductions).toBeLessThanOrEqual(4);
  });

  it('zero aircraft = zero reductions', () => {
    const result = rollEarlyWarningJamming(0);
    expect(result.rolls).toHaveLength(0);
    expect(result.reductions).toBe(0);
  });
});

describe('Detection Level Reduction', () => {
  it('reduces detection level by specified steps', () => {
    expect(applyDetectionLevelReduction('A', 1)).toBe('B');
    expect(applyDetectionLevelReduction('A', 3)).toBe('D');
    expect(applyDetectionLevelReduction('C', 2)).toBe('E');
  });

  it('caps at F', () => {
    expect(applyDetectionLevelReduction('D', 5)).toBe('F');
    expect(applyDetectionLevelReduction('F', 1)).toBe('F');
  });

  it('zero reductions = no change', () => {
    expect(applyDetectionLevelReduction('B', 0)).toBe('B');
  });
});
