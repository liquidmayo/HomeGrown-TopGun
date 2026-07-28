import { describe, it, expect } from 'vitest';
import { PHASE_TIPS } from '@tutorial/tips/phaseTips';
import { CONTEXT_TIPS } from '@tutorial/tips/contextTips';
import { searchRules, RULE_ENTRIES } from '@tutorial/ruleReference';
import { TUTORIALS, getTutorial } from '@tutorial/tutorials/tutorialDefinitions';

describe('Phase Tips', () => {
  it('has tips for all game phases', () => {
    const phases = ['setup', 'randomEvent', 'jamming', 'detection', 'movement',
      'fuel', 'samLocation', 'track', 'samAcquisition', 'admin', 'completed'];
    for (const phase of phases) {
      expect(PHASE_TIPS[phase]).toBeDefined();
      expect(PHASE_TIPS[phase].title).toBeTruthy();
      expect(PHASE_TIPS[phase].summary).toBeTruthy();
      expect(PHASE_TIPS[phase].steps.length).toBeGreaterThan(0);
      expect(PHASE_TIPS[phase].tips.length).toBeGreaterThan(0);
      expect(PHASE_TIPS[phase].ruleRef).toBeTruthy();
    }
  });

  it('movement phase has at least 5 steps', () => {
    expect(PHASE_TIPS.movement.steps.length).toBeGreaterThanOrEqual(5);
  });
});

describe('Context Tips', () => {
  it('has tips for altitude bands', () => {
    expect(CONTEXT_TIPS.altitude_deck).toBeDefined();
    expect(CONTEXT_TIPS.altitude_low).toBeDefined();
    expect(CONTEXT_TIPS.altitude_medium).toBeDefined();
    expect(CONTEXT_TIPS.altitude_high).toBeDefined();
    expect(CONTEXT_TIPS.altitude_veryHigh).toBeDefined();
  });

  it('has tips for markers', () => {
    expect(CONTEXT_TIPS.marker_maneuver).toBeDefined();
    expect(CONTEXT_TIPS.marker_disordered).toBeDefined();
    expect(CONTEXT_TIPS.marker_abort).toBeDefined();
  });

  it('has tips for ground units', () => {
    expect(CONTEXT_TIPS.unit_sam).toBeDefined();
    expect(CONTEXT_TIPS.unit_ewr).toBeDefined();
    expect(CONTEXT_TIPS.unit_aaa).toBeDefined();
  });

  it('has tips for combat', () => {
    expect(CONTEXT_TIPS.combat_surprise).toBeDefined();
    expect(CONTEXT_TIPS.combat_bvr).toBeDefined();
    expect(CONTEXT_TIPS.combat_standard).toBeDefined();
  });

  it('all tips have title and text', () => {
    for (const [id, tip] of Object.entries(CONTEXT_TIPS)) {
      expect(tip.title).toBeTruthy();
      expect(tip.text).toBeTruthy();
    }
  });
});

describe('Rule Reference', () => {
  it('has 30+ rule entries', () => {
    expect(RULE_ENTRIES.length).toBeGreaterThanOrEqual(30);
  });

  it('search finds movement rules', () => {
    const results = searchRules('movement');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.section === '6.0')).toBe(true);
  });

  it('search finds SAM rules', () => {
    const results = searchRules('SAM');
    expect(results.length).toBeGreaterThan(0);
  });

  it('search by section number', () => {
    const results = searchRules('11.0');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].section).toBe('11.0');
  });

  it('empty search returns all', () => {
    expect(searchRules('').length).toBe(RULE_ENTRIES.length);
  });
});

describe('Tutorials', () => {
  it('has 5 tutorials', () => {
    expect(TUTORIALS.length).toBe(5);
  });

  it('each tutorial has steps', () => {
    for (const tut of TUTORIALS) {
      expect(tut.steps.length).toBeGreaterThan(0);
      expect(tut.name).toBeTruthy();
      expect(tut.description).toBeTruthy();
      expect(tut.scenarioId).toBeTruthy();
    }
  });

  it('can retrieve tutorial by ID', () => {
    expect(getTutorial('tut-movement')).toBeDefined();
    expect(getTutorial('tut-detection')).toBeDefined();
    expect(getTutorial('tut-combat')).toBeDefined();
    expect(getTutorial('tut-bombing')).toBeDefined();
    expect(getTutorial('tut-full')).toBeDefined();
    expect(getTutorial('nonexistent')).toBeUndefined();
  });

  it('movement tutorial covers key concepts', () => {
    const tut = getTutorial('tut-movement')!;
    const texts = tut.steps.map((s) => s.text.toLowerCase()).join(' ');
    expect(texts).toContain('movement point');
    expect(texts).toContain('altitude');
    expect(texts).toContain('throttle');
  });

  it('tutorials reference correct scenarios', () => {
    expect(getTutorial('tut-movement')!.scenarioId).toBe('rs01');
    expect(getTutorial('tut-bombing')!.scenarioId).toBe('rs-solo-a');
    expect(getTutorial('tut-full')!.scenarioId).toBe('rs-solo-a');
  });
});
