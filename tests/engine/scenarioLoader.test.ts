import { describe, it, expect } from 'vitest';
import { loadScenario } from '@engine/scenarioLoader';

describe('Scenario Loader', () => {
  describe('RS1: Morning Recon', () => {
    const state = loadScenario('rs01');

    it('loads basic scenario info', () => {
      expect(state.scenarioId).toBe('rs01');
      expect(state.scenarioName).toContain('Morning Recon');
      expect(state.turn).toBe(1);
      expect(state.maxTurns).toBe(15);
      expect(state.timeOfDay).toBe('day');
      expect(state.phase).toBe('setup');
    });

    it('sets detection levels to A/A', () => {
      expect(state.natoDetectionLevel).toBe('A');
      expect(state.wpDetectionLevel).toBe('A');
    });

    it('loads the play area map hexes', () => {
      const hexIds = Object.keys(state.hexes);
      expect(hexIds.length).toBeGreaterThan(0);

      // All hexes should be in the play area: col 39-79, row 0-10
      for (const id of hexIds) {
        const col = parseInt(id.substring(0, 2), 10);
        const row = parseInt(id.substring(2, 4), 10);
        expect(col).toBeGreaterThanOrEqual(39);
        expect(col).toBeLessThanOrEqual(79);
        expect(row).toBeGreaterThanOrEqual(0);
        expect(row).toBeLessThanOrEqual(10);
      }
    });

    it('loads NATO CAP flight', () => {
      expect(state.flights['CAP-1']).toBeDefined();
      const cap = state.flights['CAP-1'];
      expect(cap.side).toBe('nato');
      expect(cap.nation).toBe('UK');
      expect(cap.aircraftType).toBe('FGR2');
      expect(cap.task).toBe('cap');
      expect(cap.altitude).toBe('deck');
      expect(cap.aircraft).toHaveLength(2);
      expect(cap.aggressionValue).toBe(1);
    });

    it('loads WP Recon flight', () => {
      expect(state.flights['RECON-1']).toBeDefined();
      const recon = state.flights['RECON-1'];
      expect(recon.side).toBe('wp');
      expect(recon.nation).toBe('USSR');
      expect(recon.aircraftType).toBe('Su-24MR');
      expect(recon.task).toBe('recon');
      expect(recon.aircraft).toHaveLength(2);
      expect(recon.aggressionValue).toBe(2);
    });

    it('loads NATO ground units (2 HAWKs + 1 EWR)', () => {
      expect(state.groundUnits['HAWK-1']).toBeDefined();
      expect(state.groundUnits['HAWK-2']).toBeDefined();
      expect(state.groundUnits['EWR-1']).toBeDefined();

      expect(state.groundUnits['HAWK-1'].type).toBe('sam');
      expect(state.groundUnits['HAWK-1'].subType).toBe('HAWK_C');
      expect(state.groundUnits['HAWK-1'].located).toBe(true);
      expect(state.groundUnits['HAWK-1'].radarOn).toBe(true);

      expect(state.groundUnits['EWR-1'].type).toBe('ewr');
    });

    it('loads WP ground units (1 EWR)', () => {
      expect(state.groundUnits['EWR-2']).toBeDefined();
      expect(state.groundUnits['EWR-2'].side).toBe('wp');
    });

    it('sets up the front line', () => {
      expect(state.frontHexes.length).toBeGreaterThan(0);
    });

    it('has an initial event log entry', () => {
      expect(state.eventLog.length).toBe(1);
      expect(state.eventLog[0].type).toBe('scenario_loaded');
    });
  });

  it('throws for unknown scenario', () => {
    expect(() => loadScenario('nonexistent')).toThrow('Unknown scenario');
  });
});
