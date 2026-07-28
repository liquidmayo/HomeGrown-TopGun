import { describe, it, expect } from 'vitest';

// Weather
import { rollWeather, isLOSBlockedByCloud, isInHaze, isInMist } from '@engine/rules/weather';

// Night
import { canFlyAtNight, getNightMaxTurn, rollGroundCollision, canUseBombingProfileAtNight } from '@engine/rules/night';

// Fuel
import { shouldMarkFuel, hasExceededFuel, rollRecovery, autoRecovers } from '@engine/rules/fuel';

// Airfield
import { canTakeOff, canLand, canRefuelRearm, getTakeoffManeuverRating } from '@engine/rules/airfield';

// Random Events
import { rollRandomEvent, shouldIgnoreEvent } from '@engine/rules/randomEvents';

// Recon
import { canConductReconRun, canUseSAR, getSideLookingOffset } from '@engine/rules/recon';

// Helicopters
import { isHelicopter, getHelicopterCombatRules, canHelicopterLand } from '@engine/rules/helicopters';

// CSAR
import { rollBailout, getLandingTurns, checkAutoRescueCapture, rollSimpleCSAR } from '@engine/rules/csar';

// Victory
import { calculateVP, determineVictoryLevel } from '@engine/rules/victory';

import { FlightState, createEmptyGameState, WeatherState } from '@engine/state/GameState';

function createFlight(overrides: Partial<FlightState> = {}): FlightState {
  return {
    id: 'F-1', side: 'nato', nation: 'US', aircraftType: 'F-15C',
    genericCounterId: null, isVisuallyIdentified: false, isDummy: false,
    hex: { col: 50, row: 5 }, onHexside: false, heading: 0, altitude: 'medium',
    throttle: 'combat', speed: 5, mpRemaining: 0, hasMoved: true,
    hasMovedThisPhase: false,
    aircraft: [{ index: 1, damage: 'none', bombStrength: 0, bombStrengthRemaining: 0,
      ordnance: [], airToAirWeapons: [{ weaponId: 'AIM-7M', depleted: false }],
      crewCount: 1, crewStatus: ['ok'] }],
    task: 'cap', raidId: null, flightPath: null, currentWaypointIndex: 0,
    detected: false, disordered: false, aborted: false, inDefensiveWheel: false,
    isOnGround: false, groundState: null, takeoffTurn: null, landingTurn: null,
    markers: [], pilotQuality: 'veteran', aggressionValue: 0,
    fuelUsed: 0, fuelAllowance: 5, extraFuelUsed: 0,
    ...overrides,
  };
}

// ── Weather Tests ────────────────────────────────────────────────

describe('Weather', () => {
  it('rolls weather on good or poor column', () => {
    const good = rollWeather('good');
    expect(good.roll).toBeGreaterThanOrEqual(1);
    expect(good.roll).toBeLessThanOrEqual(10);
    expect(good.column).toBe('good');

    const poor = rollWeather('poor');
    expect(poor.column).toBe('poor');
  });

  it('detects haze at correct altitudes', () => {
    const weather: WeatherState = {
      haze: true, hazeMaxAltitude: 'low', mist: false,
      cloudLayers: [], cloudBreaks: [], goodContrast: false,
    };
    expect(isInHaze('deck', weather)).toBe(true);
    expect(isInHaze('low', weather)).toBe(true);
    expect(isInHaze('medium', weather)).toBe(false);
  });

  it('detects mist only at Deck', () => {
    const weather: WeatherState = {
      haze: false, hazeMaxAltitude: null, mist: true,
      cloudLayers: [], cloudBreaks: [], goodContrast: false,
    };
    expect(isInMist('deck', weather)).toBe(true);
    expect(isInMist('low', weather)).toBe(false);
  });

  it('dense cloud blocks LOS between altitude bands', () => {
    const weather: WeatherState = {
      haze: false, hazeMaxAltitude: null, mist: false,
      cloudLayers: [{ type: 'dense', betweenLow: 'low', betweenHigh: 'medium' }],
      cloudBreaks: [], goodContrast: false,
    };
    expect(isLOSBlockedByCloud('deck', 'high', weather)).toBe(true);
    expect(isLOSBlockedByCloud('deck', 'deck', weather)).toBe(false);
  });
});

// ── Night Tests ──────────────────────────────────────────────────

describe('Night', () => {
  it('full night aircraft can fly any task', () => {
    expect(canFlyAtNight('Su-24MR', 'recon', 'none')).toBe(true); // Has Night capability
  });

  it('limited night can only do CAP/escort or clear/full moon', () => {
    expect(canFlyAtNight('F-15C', 'cap', 'none')).toBe(true);
    expect(canFlyAtNight('F-15C', 'bombing', 'full')).toBe(true);
    expect(canFlyAtNight('F-15C', 'bombing', 'none')).toBe(false);
  });

  it('night max turn is 60° (30° at speed 9+)', () => {
    expect(getNightMaxTurn(5)).toBe(60);
    expect(getNightMaxTurn(9)).toBe(30);
  });

  it('TFR-equipped aircraft are immune to ground collision', () => {
    const result = rollGroundCollision(true, true, 'none', true);
    expect(result.crashed).toBe(false);
  });
});

// ── Fuel Tests ───────────────────────────────────────────────────

describe('Fuel', () => {
  it('marks fuel for dash and combat', () => {
    expect(shouldMarkFuel(createFlight(), true, false)).toBe(1);
    expect(shouldMarkFuel(createFlight(), true, true)).toBe(2);
    expect(shouldMarkFuel(createFlight(), false, false)).toBe(0);
  });

  it('detects exceeded fuel', () => {
    expect(hasExceededFuel(createFlight({ fuelUsed: 3, fuelAllowance: 5 }))).toBe(false);
    expect(hasExceededFuel(createFlight({ fuelUsed: 6, fuelAllowance: 5 }))).toBe(true);
  });

  it('recovery roll produces valid result', () => {
    const ac = { index: 1, damage: 'none' as const, bombStrength: 0, bombStrengthRemaining: 0,
      ordnance: [], airToAirWeapons: [], crewCount: 1, crewStatus: ['ok' as const] };
    const result = rollRecovery(ac, false, false, false, false);
    expect(typeof result.recovered).toBe('boolean');
    expect(result.roll).toBeGreaterThanOrEqual(2);
  });
});

// ── Airfield Tests ───────────────────────────────────────────────

describe('Airfield', () => {
  it('flight must be Ready to take off', () => {
    const state = createEmptyGameState();
    state.hexes['5005'] = { coord: { col: 50, row: 5 }, terrain: ['land'],
      isAirfield: true, airfieldClass: 4, airfieldId: 'Test', printedAAA: null, isEastGermany: false };
    const flight = createFlight({ groundState: 'unready', isOnGround: true });
    const check = canTakeOff(flight, { col: 50, row: 5 }, 4, state);
    expect(check.canTakeOff).toBe(false);
  });

  it('landing requires Deck altitude and Combat throttle', () => {
    const check1 = canLand(createFlight({ altitude: 'low' }), { col: 50, row: 5 }, 4);
    expect(check1.canLand).toBe(false);

    const check2 = canLand(createFlight({ altitude: 'deck', throttle: 'dash' }), { col: 50, row: 5 }, 4);
    expect(check2.canLand).toBe(false);

    const check3 = canLand(createFlight({ altitude: 'deck', throttle: 'combat' }), { col: 50, row: 5 }, 4);
    expect(check3.canLand).toBe(true);
  });

  it('only CAP flights can refuel/rearm', () => {
    expect(canRefuelRearm(createFlight({ task: 'cap' }), 3)).toBe(true);
    expect(canRefuelRearm(createFlight({ task: 'bombing' }), 3)).toBe(false);
  });

  it('takeoff maneuver rating is 1', () => {
    expect(getTakeoffManeuverRating()).toBe(1);
  });
});

// ── Random Events Tests ──────────────────────────────────────────

describe('Random Events', () => {
  it('no event on turn 1', () => {
    const result = rollRandomEvent(1);
    expect(result.event).toBeNull();
  });

  it('produces valid result on turn 2+', () => {
    const result = rollRandomEvent(3);
    expect(result.roll).toBeGreaterThanOrEqual(2);
    expect(result.roll).toBeLessThanOrEqual(20);
  });

  it('can ignore specific events', () => {
    expect(shouldIgnoreEvent('nato_qra', ['nato_qra', 'wp_qra'])).toBe(true);
    expect(shouldIgnoreEvent('weather_shift', ['nato_qra'])).toBe(false);
  });
});

// ── Recon Tests ──────────────────────────────────────────────────

describe('Recon', () => {
  it('non-recon flights cannot conduct recon runs', () => {
    const flight = createFlight({ task: 'cap' });
    const weather: WeatherState = { haze: false, hazeMaxAltitude: null, mist: false, cloudLayers: [], cloudBreaks: [], goodContrast: false };
    const check = canConductReconRun(flight, { col: 52, row: 5 }, 3, weather);
    expect(check.canRecon).toBe(false);
  });

  it('side-looking camera offset by altitude', () => {
    expect(getSideLookingOffset('medium')).toBe(3);
    expect(getSideLookingOffset('low')).toBe(1);
    expect(getSideLookingOffset('deck')).toBe(0);
  });
});

// ── Helicopter Tests ─────────────────────────────────────────────

describe('Helicopters', () => {
  it('identifies helicopter types', () => {
    expect(isHelicopter('UH-60')).toBe(true);
    expect(isHelicopter('F-15C')).toBe(false);
  });

  it('helicopter combat rules are restrictive', () => {
    const rules = getHelicopterCombatRules();
    expect(rules.noScatter).toBe(true);
    expect(rules.mustDisengage).toBe(true);
    expect(rules.crippledIsShotDown).toBe(true);
  });
});

// ── CSAR Tests ───────────────────────────────────────────────────

describe('CSAR', () => {
  it('bailout roll produces valid result', () => {
    const result = rollBailout();
    expect(result.roll).toBeGreaterThanOrEqual(1);
    expect(typeof result.survived).toBe('boolean');
  });

  it('landing turns by altitude', () => {
    expect(getLandingTurns('deck')).toBe(0);
    expect(getLandingTurns('low')).toBe(2);
    expect(getLandingTurns('high')).toBe(10);
  });

  it('auto rescue on friendly side', () => {
    expect(checkAutoRescueCapture({ col: 40, row: 5 }, true, false, false)).toBe('rescued');
  });

  it('auto capture in urban/enemy side', () => {
    expect(checkAutoRescueCapture({ col: 60, row: 5 }, false, true, false)).toBe('captured');
  });

  it('pending if on enemy side but not in urban', () => {
    expect(checkAutoRescueCapture({ col: 60, row: 5 }, false, false, false)).toBe('pending');
  });
});

// ── Victory Tests ────────────────────────────────────────────────

describe('Victory', () => {
  it('calculates VP from enemy losses', () => {
    const state = createEmptyGameState();
    state.flights['E-1'] = createFlight({
      id: 'E-1', side: 'wp',
      aircraft: [
        { index: 1, damage: 'shotdown', bombStrength: 0, bombStrengthRemaining: 0,
          ordnance: [], airToAirWeapons: [], crewCount: 1, crewStatus: ['captured'] },
      ],
    });
    const vp = calculateVP(state, 'nato');
    expect(vp.aircraftShotDown).toBe(3);
    expect(vp.crewCaptured).toBe(1);
    expect(vp.total).toBeGreaterThan(0);
  });

  it('determines victory level from margin', () => {
    expect(determineVictoryLevel(20, 5, 'nato').level).toBe('decisiveWin');
    expect(determineVictoryLevel(10, 5, 'nato').level).toBe('marginalWin');
    expect(determineVictoryLevel(5, 5, 'nato').level).toBe('draw');
    expect(determineVictoryLevel(5, 20, 'nato').level).toBe('decisiveLoss');
  });
});
