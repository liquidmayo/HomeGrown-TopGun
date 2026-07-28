import { describe, it, expect } from 'vitest';
import { getScenario, getScenarioList, getPlayableScenarios } from '@data/scenarios/scenarioRegistry';
import { RS_SOLO_A } from '@data/scenarios/rs-solo-a';
import { RS_SOLO_B } from '@data/scenarios/rs-solo-b';
import { RS_SOLO_C } from '@data/scenarios/rs-solo-c';
import { RS_SOLO_D } from '@data/scenarios/rs-solo-d';
import { loadScenario } from '@engine/scenarioLoader';

describe('Scenario Registry', () => {
  it('lists all scenarios', () => {
    const list = getScenarioList();
    expect(list.length).toBeGreaterThanOrEqual(34); // 30 standard + 4 solo
  });

  it('has RS1 + 4 solo scenarios playable', () => {
    const playable = getPlayableScenarios();
    expect(playable.length).toBeGreaterThanOrEqual(5);
    const ids = playable.map((s) => s.id);
    expect(ids).toContain('rs01');
    expect(ids).toContain('rs-solo-a');
    expect(ids).toContain('rs-solo-b');
    expect(ids).toContain('rs-solo-c');
    expect(ids).toContain('rs-solo-d');
  });

  it('can retrieve solo scenarios by ID', () => {
    expect(getScenario('rs-solo-a')).toBeDefined();
    expect(getScenario('rs-solo-b')).toBeDefined();
    expect(getScenario('rs-solo-c')).toBeDefined();
    expect(getScenario('rs-solo-d')).toBeDefined();
  });
});

describe('Solo Scenario A: CAS', () => {
  it('has correct basic info', () => {
    expect(RS_SOLO_A.id).toBe('rs-solo-a');
    expect(RS_SOLO_A.humanSide).toBe('nato');
    expect(RS_SOLO_A.isSoloScenario).toBe(true);
    expect(RS_SOLO_A.maxTurns).toBe(20);
    expect(RS_SOLO_A.dayNight).toBe('day');
  });

  it('has WP ground units', () => {
    expect(RS_SOLO_A.wpOOB.groundUnits.length).toBeGreaterThan(10);
    const sams = RS_SOLO_A.wpOOB.groundUnits.filter((u) => u.type === 'sam');
    expect(sams.length).toBe(2); // 2 x SA-11
  });

  it('has SAM activation zones', () => {
    expect(RS_SOLO_A.wpOOB.samActivation?.zones.length).toBe(2);
  });

  it('has AAA activation info', () => {
    expect(RS_SOLO_A.wpOOB.aaaActivation?.locations.length).toBe(8);
  });
});

describe('Solo Scenario B: Fighter Sweep', () => {
  it('human plays WP', () => {
    expect(RS_SOLO_B.humanSide).toBe('wp');
    expect(RS_SOLO_B.maxTurns).toBe(15);
  });

  it('has WP fighter flights', () => {
    expect(RS_SOLO_B.wpOOB.flights.length).toBe(4);
  });

  it('has NATO bot flight activation', () => {
    expect(RS_SOLO_B.natoOOB.botFlightActivation).toBeDefined();
    expect(RS_SOLO_B.natoOOB.botFlightActivation![0].maxRealFlights).toBe(10);
  });

  it('entire map is in play', () => {
    expect(RS_SOLO_B.playArea.minCol).toBe(0);
    expect(RS_SOLO_B.playArea.maxCol).toBe(79);
  });
});

describe('Solo Scenario C: HAWK Belt', () => {
  it('human plays WP, targets NATO HAWKs', () => {
    expect(RS_SOLO_C.humanSide).toBe('wp');
    const hawks = RS_SOLO_C.natoOOB.groundUnits.filter((u) => u.subType.includes('HAWK'));
    expect(hawks.length).toBe(4);
  });

  it('has Patriot SAM', () => {
    const patriot = RS_SOLO_C.natoOOB.groundUnits.find((u) => u.subType === 'Patriot');
    expect(patriot).toBeDefined();
  });

  it('has 3 SAM activation zones', () => {
    expect(RS_SOLO_C.natoOOB.samActivation?.zones.length).toBe(3);
  });
});

describe('Solo Scenario D: Interdiction', () => {
  it('human plays NATO, attacks WP rear', () => {
    expect(RS_SOLO_D.humanSide).toBe('nato');
    const targets = RS_SOLO_D.wpOOB.groundUnits.filter(
      (u) => u.type === 'missile' || u.type === 'supply' || u.type === 'hq'
    );
    expect(targets.length).toBe(8); // 3 missile + 3 supply + 2 HQ
  });

  it('has 3 WP SAM activation zones', () => {
    expect(RS_SOLO_D.wpOOB.samActivation?.zones.length).toBe(3);
  });

  it('has WP bot flight activation', () => {
    expect(RS_SOLO_D.wpOOB.botFlightActivation).toBeDefined();
  });
});

describe('Scenario Loader', () => {
  it('loads RS1 successfully', () => {
    const state = loadScenario('rs01');
    expect(state.scenarioId).toBe('rs01');
    expect(Object.keys(state.flights).length).toBeGreaterThan(0);
  });

  it('throws for unknown scenario', () => {
    expect(() => loadScenario('nonexistent')).toThrow();
  });
});
