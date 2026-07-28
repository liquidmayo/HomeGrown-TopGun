import { describe, it, expect, vi } from 'vitest';
import {
  getStandardDetectionModifiers,
  canAttemptVisualDetection,
  canAttemptRadarSearch,
  canAttemptEWRDetection,
  getAutoUndetectedFlights,
  shouldVisuallyIdentify,
  applyDetectionResults,
  applyTrackPhase,
  DetectionResult,
} from '@engine/rules/detection';
import { FlightState, GroundUnitState, createEmptyGameState, GameState } from '@engine/state/GameState';

function createFlight(overrides: Partial<FlightState> = {}): FlightState {
  return {
    id: 'F-1', side: 'nato', nation: 'US', aircraftType: 'F-15C',
    genericCounterId: null, isVisuallyIdentified: false, isDummy: false,
    hex: { col: 50, row: 5 }, onHexside: false, heading: 0, altitude: 'medium',
    throttle: 'combat', speed: 0, mpRemaining: 0, hasMoved: false,
    hasMovedThisPhase: false,
    aircraft: [{ index: 1, damage: 'none', bombStrength: 0, bombStrengthRemaining: 0,
      ordnance: [], airToAirWeapons: [], crewCount: 1, crewStatus: ['ok'] }],
    task: 'cap', raidId: null, flightPath: null, currentWaypointIndex: 0,
    detected: false, disordered: false, aborted: false, inDefensiveWheel: false,
    isOnGround: false, groundState: null, takeoffTurn: null, landingTurn: null,
    markers: [], pilotQuality: 'veteran', aggressionValue: 0,
    fuelUsed: 0, fuelAllowance: 5, extraFuelUsed: 0,
    ...overrides,
  };
}

function createEWR(overrides: Partial<GroundUnitState> = {}): GroundUnitState {
  return {
    id: 'EWR-1', type: 'ewr', subType: 'EWR', side: 'nato',
    hex: { col: 47, row: 6 }, hidden: false, located: true,
    isSAMWarning: false, isDummy: false, radarOn: true,
    ammoRemaining: 0, ammoMax: 0, acquisitions: {},
    phasedArrayArc: null, active: true, concentration: null,
    damage: 'none', radarSuppressedTurns: 0, radarShutdown: false,
    aaaSuppression: 0, organicSmallArms: false, organicLightAAA: true,
    organicMobileAAA: null, organicMobileRadarOn: false,
    ...overrides,
  };
}

function setupGameState(): GameState {
  const state = createEmptyGameState();
  // Add some hex data for terrain checks
  state.hexes['5005'] = {
    coord: { col: 50, row: 5 }, terrain: ['land'],
    isAirfield: false, airfieldClass: null, airfieldId: null,
    printedAAA: null, isEastGermany: false,
  };
  state.hexes['5505'] = {
    coord: { col: 55, row: 5 }, terrain: ['land'],
    isAirfield: false, airfieldClass: null, airfieldId: null,
    printedAAA: null, isEastGermany: true,
  };
  state.hexes['6005'] = {
    coord: { col: 60, row: 5 }, terrain: ['rough'],
    isAirfield: false, airfieldClass: null, airfieldId: null,
    printedAAA: null, isEastGermany: true,
  };
  state.hexes['6505'] = {
    coord: { col: 65, row: 5 }, terrain: ['mountain'],
    isAirfield: false, airfieldClass: null, airfieldId: null,
    printedAAA: null, isEastGermany: true,
  };
  return state;
}

describe('Detection Modifiers', () => {
  it('deck altitude gives -4 modifier', () => {
    const target = createFlight({ altitude: 'deck', hex: { col: 50, row: 5 } });
    const state = setupGameState();
    const mods = getStandardDetectionModifiers(target, state);
    expect(mods.altitudeMod).toBe(-4);
  });

  it('high altitude gives +2 modifier', () => {
    const target = createFlight({ altitude: 'high' });
    const state = setupGameState();
    const mods = getStandardDetectionModifiers(target, state);
    expect(mods.altitudeMod).toBe(2);
  });

  it('deck in rough terrain gives extra penalty', () => {
    const target = createFlight({ altitude: 'deck', hex: { col: 60, row: 5 } });
    const state = setupGameState();
    const mods = getStandardDetectionModifiers(target, state);
    expect(mods.terrainMod).toBe(-2);
  });

  it('deck in mountain terrain gives bigger penalty', () => {
    const target = createFlight({ altitude: 'deck', hex: { col: 65, row: 5 } });
    const state = setupGameState();
    const mods = getStandardDetectionModifiers(target, state);
    expect(mods.terrainMod).toBe(-3);
  });
});

describe('Visual Detection Eligibility', () => {
  it('can detect enemy within 4 hexes with LOS', () => {
    const detector = createFlight({ id: 'DET', side: 'nato', hex: { col: 52, row: 5 } });
    const target = createFlight({ id: 'TGT', side: 'wp', hex: { col: 55, row: 5 }, detected: false });
    const state = setupGameState();
    expect(canAttemptVisualDetection(detector, target, state)).toBe(true);
  });

  it('cannot detect beyond 4 hexes', () => {
    const detector = createFlight({ id: 'DET', side: 'nato', hex: { col: 40, row: 5 } });
    const target = createFlight({ id: 'TGT', side: 'wp', hex: { col: 55, row: 5 }, detected: false });
    const state = setupGameState();
    expect(canAttemptVisualDetection(detector, target, state)).toBe(false);
  });

  it('cannot detect friendly flights', () => {
    const detector = createFlight({ id: 'DET', side: 'nato', hex: { col: 52, row: 5 } });
    const target = createFlight({ id: 'TGT', side: 'nato', hex: { col: 55, row: 5 }, detected: false });
    const state = setupGameState();
    expect(canAttemptVisualDetection(detector, target, state)).toBe(false);
  });

  it('disordered flight cannot detect', () => {
    const detector = createFlight({ id: 'DET', side: 'nato', hex: { col: 52, row: 5 }, disordered: true });
    const target = createFlight({ id: 'TGT', side: 'wp', hex: { col: 55, row: 5 }, detected: false });
    const state = setupGameState();
    expect(canAttemptVisualDetection(detector, target, state)).toBe(false);
  });

  it('already-detected flights are skipped', () => {
    const detector = createFlight({ id: 'DET', side: 'nato', hex: { col: 52, row: 5 } });
    const target = createFlight({ id: 'TGT', side: 'wp', hex: { col: 55, row: 5 }, detected: true });
    const state = setupGameState();
    expect(canAttemptVisualDetection(detector, target, state)).toBe(false);
  });
});

describe('Radar Search Eligibility', () => {
  it('F-15C can radar search target in forward arc within range', () => {
    const detector = createFlight({
      id: 'DET', side: 'nato', aircraftType: 'F-15C',
      hex: { col: 50, row: 5 }, heading: 0, // Facing east
    });
    const target = createFlight({
      id: 'TGT', side: 'wp', hex: { col: 55, row: 5 },
      altitude: 'medium', detected: false,
    });
    const state = setupGameState();
    expect(canAttemptRadarSearch(detector, target, state)).toBe(true);
  });

  it('cannot radar search target in rear arc', () => {
    const detector = createFlight({
      id: 'DET', side: 'nato', aircraftType: 'F-15C',
      hex: { col: 55, row: 5 }, heading: 0, // Facing east
    });
    const target = createFlight({
      id: 'TGT', side: 'wp', hex: { col: 50, row: 5 }, // West of detector
      altitude: 'medium', detected: false,
    });
    const state = setupGameState();
    expect(canAttemptRadarSearch(detector, target, state)).toBe(false);
  });

  it('No_LD aircraft cannot radar search lower-altitude targets', () => {
    const detector = createFlight({
      id: 'DET', side: 'nato', aircraftType: 'F-4E', // No_LD
      hex: { col: 50, row: 5 }, heading: 0, altitude: 'high',
    });
    const target = createFlight({
      id: 'TGT', side: 'wp', hex: { col: 55, row: 5 },
      altitude: 'medium', detected: false,
    });
    const state = setupGameState();
    expect(canAttemptRadarSearch(detector, target, state)).toBe(false);
  });

  it('LD aircraft can radar search lower-altitude targets', () => {
    const detector = createFlight({
      id: 'DET', side: 'nato', aircraftType: 'F-15C', // LD
      hex: { col: 50, row: 5 }, heading: 0, altitude: 'high',
    });
    const target = createFlight({
      id: 'TGT', side: 'wp', hex: { col: 55, row: 5 },
      altitude: 'medium', detected: false,
    });
    const state = setupGameState();
    expect(canAttemptRadarSearch(detector, target, state)).toBe(true);
  });
});

describe('EWR Detection Eligibility', () => {
  it('EWR can detect within 20 hexes', () => {
    const ewr = createEWR({ side: 'nato', hex: { col: 47, row: 6 } });
    const target = createFlight({ id: 'TGT', side: 'wp', hex: { col: 55, row: 5 }, detected: false });
    expect(canAttemptEWRDetection(ewr, target)).toBe(true);
  });

  it('EWR range reduced to 10 for Deck targets', () => {
    const ewr = createEWR({ side: 'nato', hex: { col: 47, row: 6 } });
    const target = createFlight({
      id: 'TGT', side: 'wp', hex: { col: 60, row: 5 },
      altitude: 'deck', detected: false,
    });
    // Distance > 10 hexes
    expect(canAttemptEWRDetection(ewr, target)).toBe(false);
  });

  it('EWR with radar off cannot detect', () => {
    const ewr = createEWR({ radarOn: false });
    const target = createFlight({ id: 'TGT', side: 'wp', detected: false });
    expect(canAttemptEWRDetection(ewr, target)).toBe(false);
  });

  it('destroyed EWR cannot detect', () => {
    const ewr = createEWR({ damage: 'destroyed' });
    const target = createFlight({ id: 'TGT', side: 'wp', detected: false });
    expect(canAttemptEWRDetection(ewr, target)).toBe(false);
  });
});

describe('Auto-Undetect in Track Phase', () => {
  it('NATO flight at Deck in Rough becomes undetected', () => {
    const state = setupGameState();
    state.flights['F-1'] = createFlight({
      side: 'nato', altitude: 'deck', hex: { col: 60, row: 5 },
      detected: true,
    });
    const result = getAutoUndetectedFlights(state);
    expect(result).toContain('F-1');
  });

  it('flight at Deck in Mountain becomes undetected', () => {
    const state = setupGameState();
    state.flights['F-1'] = createFlight({
      side: 'wp', altitude: 'deck', hex: { col: 65, row: 5 },
      detected: true,
    });
    const result = getAutoUndetectedFlights(state);
    expect(result).toContain('F-1');
  });

  it('flight not at Deck is not auto-undetected', () => {
    const state = setupGameState();
    state.flights['F-1'] = createFlight({
      side: 'nato', altitude: 'low', hex: { col: 60, row: 5 },
      detected: true,
    });
    const result = getAutoUndetectedFlights(state);
    expect(result).not.toContain('F-1');
  });
});

describe('Visual Identification', () => {
  it('identifies flight within 1 hex of enemy flight within 1 alt band', () => {
    const state = setupGameState();
    const flight = createFlight({
      id: 'TGT', side: 'wp', hex: { col: 51, row: 5 },
      altitude: 'medium', isVisuallyIdentified: false,
    });
    state.flights['TGT'] = flight;
    state.flights['DET'] = createFlight({
      id: 'DET', side: 'nato', hex: { col: 50, row: 5 },
      altitude: 'medium',
    });
    expect(shouldVisuallyIdentify(flight, state)).toBe(true);
  });

  it('does not identify if already identified', () => {
    const state = setupGameState();
    const flight = createFlight({
      id: 'TGT', side: 'wp', hex: { col: 51, row: 5 },
      isVisuallyIdentified: true,
    });
    state.flights['TGT'] = flight;
    expect(shouldVisuallyIdentify(flight, state)).toBe(false);
  });
});

describe('Apply Detection Results', () => {
  it('applies detected results to game state', () => {
    const state = setupGameState();
    state.flights['F-1'] = createFlight({ id: 'F-1', detected: false });

    const results: DetectionResult[] = [
      {
        targetId: 'F-1', detected: true, roll: 15, needed: 10,
        modifiers: { altitudeMod: 0, terrainMod: 0, jamMod: 0, otherMod: 0 },
        totalModifier: 0, method: 'standard',
      },
    ];

    const newState = applyDetectionResults(state, results);
    expect(newState.flights['F-1'].detected).toBe(true);
  });

  it('does not change undetected results', () => {
    const state = setupGameState();
    state.flights['F-1'] = createFlight({ id: 'F-1', detected: false });

    const results: DetectionResult[] = [
      {
        targetId: 'F-1', detected: false, roll: 5, needed: 10,
        modifiers: { altitudeMod: 0, terrainMod: 0, jamMod: 0, otherMod: 0 },
        totalModifier: 0, method: 'standard',
      },
    ];

    const newState = applyDetectionResults(state, results);
    expect(newState.flights['F-1'].detected).toBe(false);
  });
});
