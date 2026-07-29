/**
 * Random Event Phase panel.
 * Allows digital dice roll or manual entry, then resolves the event.
 */

import React, { useState, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import { rollRandomEvent, RandomEventRollResult } from '@engine/rules/randomEvents';
import { roll1d10 } from '@engine/rules/detection';
import { playDiceRoll } from '../../audio';

const s: Record<string, React.CSSProperties> = {
  panel: {
    backgroundColor: '#1a1a2e', borderRadius: 4, border: '1px solid #0f3460',
    marginTop: 8, padding: 12,
  },
  title: {
    color: '#ffaa44', fontWeight: 'bold', fontSize: 13, marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  text: { color: '#ccc', fontSize: 12, lineHeight: 1.6, marginBottom: 8 },
  btn: {
    display: 'inline-block', padding: '8px 14px', marginRight: 8, marginTop: 6,
    backgroundColor: '#0f3460', color: '#e0e0e0', border: '1px solid #1a4a80',
    borderRadius: 4, fontSize: 12, cursor: 'pointer', textAlign: 'center' as const,
  },
  btnPrimary: {
    backgroundColor: '#ffaa44', color: '#000', border: '1px solid #ffaa44', fontWeight: 'bold',
  },
  result: {
    backgroundColor: '#0a1628', border: '1px solid #1a4a80', borderRadius: 4,
    padding: '10px 12px', marginTop: 8, fontSize: 12, color: '#aaa',
  },
  eventBox: {
    backgroundColor: '#2a1a0a', border: '1px solid #ff8844', borderRadius: 4,
    padding: '10px 12px', marginTop: 8,
  },
  eventName: { color: '#ffaa44', fontSize: 14, fontWeight: 'bold' },
  eventDesc: { color: '#ddd', fontSize: 12, marginTop: 4, lineHeight: 1.6 },
  noEvent: {
    backgroundColor: '#0a1a0a', border: '1px solid #2a5a2a', borderRadius: 4,
    padding: '10px 12px', marginTop: 8, color: '#6a6', fontSize: 12,
  },
  diceRow: {
    display: 'flex', alignItems: 'center', gap: 8, marginTop: 8,
  },
  diceDisplay: {
    display: 'flex', gap: 6,
  },
  die: {
    width: 36, height: 36, borderRadius: 6, display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontSize: 18,
    fontWeight: 'bold', fontFamily: 'monospace',
    backgroundColor: '#1a1a2e', border: '2px solid #ffaa44', color: '#ffaa44',
  },
  manualInput: {
    width: 50, padding: '6px 8px', fontSize: 14, textAlign: 'center' as const,
    backgroundColor: '#1a1a2e', color: '#ffaa44', border: '1px solid #0f3460',
    borderRadius: 4, fontFamily: 'monospace',
  },
  label: { color: '#888', fontSize: 10, textTransform: 'uppercase' as const },
  ruleRef: { color: '#666', fontSize: 10, fontStyle: 'italic', marginTop: 8 },
  table: { fontSize: 11, color: '#aaa', marginTop: 8, lineHeight: 1.8 },
  tableRow: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #0f3460', padding: '2px 0' },
};

const EVENT_TABLE: { roll: string; name: string }[] = [
  { roll: '2', name: 'NATO QRA' },
  { roll: '3', name: 'WP QRA' },
  { roll: '4', name: 'NATO Flight in Trouble' },
  { roll: '5', name: 'WP Flight in Trouble' },
  { roll: '6', name: 'ROE Change' },
  { roll: '7', name: 'Weather Shift' },
  { roll: '8–17', name: 'No Event' },
  { roll: '18', name: 'MANPAD Ambush' },
  { roll: '19', name: 'SEAD Strike' },
  { roll: '20', name: 'Intel Update' },
];

const RandomEventPanel: React.FC = () => {
  const { gameState, updateGameState } = useGameStore();
  const [resolved, setResolved] = useState(false);
  const [result, setResult] = useState<RandomEventRollResult | null>(null);
  const [die1, setDie1] = useState<number | null>(null);
  const [die2, setDie2] = useState<number | null>(null);
  const [manualValue, setManualValue] = useState('');
  const [showTable, setShowTable] = useState(false);

  const isFirstTurn = gameState.turn === 1;

  const resolveWithRoll = useCallback((rollTotal: number, d1: number, d2: number) => {
    setDie1(d1);
    setDie2(d2);

    // Look up event
    const eventResult = rollRandomEvent(gameState.turn);
    // Override with the actual roll value
    const EVENTS: Record<number, any> = {
      2: { id: 'nato_qra', name: 'NATO QRA', description: 'NATO Quick Reaction Alert flight scrambles from a nearby airfield.' },
      3: { id: 'wp_qra', name: 'WP QRA', description: 'WP Quick Reaction Alert flight scrambles from a nearby airfield.' },
      4: { id: 'nato_flight_trouble', name: 'NATO Flight in Trouble', description: 'One NATO flight suffers a mechanical issue. Roll to determine affected flight.' },
      5: { id: 'wp_flight_trouble', name: 'WP Flight in Trouble', description: 'One WP flight suffers a mechanical issue.' },
      6: { id: 'roe_change', name: 'ROE Change', description: 'Rules of Engagement change. BVR combat may be restricted or allowed for this turn.' },
      7: { id: 'weather_shift', name: 'Weather Shift', description: 'Weather conditions change. Reroll on the Weather Table.' },
      18: { id: 'manpad_ambush', name: 'MANPAD Ambush', description: 'A flight at Deck altitude on the enemy side of the front is attacked by a shoulder-fired SAM.' },
      19: { id: 'sead_strike', name: 'SEAD Strike', description: 'Off-map SEAD strike suppresses one enemy SAM or AAA unit.' },
      20: { id: 'intel_update', name: 'Intel Update', description: 'Intelligence update improves detection level by one step for this turn.' },
    };

    const event = EVENTS[rollTotal] ?? null;
    const finalResult: RandomEventRollResult = { roll: rollTotal, event };
    setResult(finalResult);
    setResolved(true);

    // Apply effect to game state
    updateGameState((state) => ({
      ...state,
      eventLog: [
        ...state.eventLog,
        {
          turn: state.turn, phase: state.phase, timestamp: Date.now(),
          type: 'random_event',
          message: event
            ? `Random Event (roll ${rollTotal}): ${event.name} — ${event.description}`
            : `Random Event (roll ${rollTotal}): No event.`,
        },
      ],
    }));
  }, [gameState.turn, updateGameState]);

  // Digital dice roll
  const handleDigitalRoll = useCallback(() => {
    playDiceRoll();
    const d1 = Math.floor(Math.random() * 10) + 1;
    const d2 = Math.floor(Math.random() * 10) + 1;
    resolveWithRoll(d1 + d2, d1, d2);
  }, [resolveWithRoll]);

  // Manual entry
  const handleManualSubmit = useCallback(() => {
    const val = parseInt(manualValue, 10);
    if (isNaN(val) || val < 2 || val > 20) return;
    // Approximate two dice that sum to val
    const d1 = Math.min(10, Math.max(1, Math.floor(val / 2)));
    const d2 = val - d1;
    resolveWithRoll(val, d1, d2);
  }, [manualValue, resolveWithRoll]);

  if (gameState.phase !== 'randomEvent') return null;

  return (
    <div style={s.panel}>
      <div style={s.title}>Random Event Phase</div>

      {isFirstTurn ? (
        <div style={s.noEvent}>
          No random event on Turn 1. Advance to the next phase.
        </div>
      ) : !resolved ? (
        <>
          <div style={s.text}>
            Roll 2d10 to check for random events. Most rolls (8–17) produce no event.
          </div>

          <div>
            <button style={{ ...s.btn, ...s.btnPrimary }} onClick={handleDigitalRoll}>
              Roll 2d10 (Digital)
            </button>
          </div>

          <div style={s.diceRow}>
            <span style={s.label}>Or enter manual roll (2–20):</span>
            <input
              style={s.manualInput}
              type="number"
              min={2}
              max={20}
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
              placeholder="—"
            />
            <button style={s.btn} onClick={handleManualSubmit} disabled={!manualValue}>
              Apply
            </button>
          </div>

          <div style={{ marginTop: 8 }}>
            <span style={{ ...s.label, cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setShowTable(!showTable)}>
              {showTable ? 'Hide' : 'Show'} Event Table
            </span>
          </div>

          {showTable && (
            <div style={s.table}>
              {EVENT_TABLE.map((row) => (
                <div key={row.roll} style={s.tableRow}>
                  <span style={{ color: '#ffaa44', fontFamily: 'monospace', minWidth: 40 }}>{row.roll}</span>
                  <span>{row.name}</span>
                </div>
              ))}
            </div>
          )}

          <div style={s.ruleRef}>Rule [21.0] — No more than one random event per turn.</div>
        </>
      ) : (
        <>
          {/* Dice result display */}
          <div style={s.diceRow}>
            <div style={s.diceDisplay}>
              <div style={s.die}>{die1}</div>
              <div style={s.die}>{die2}</div>
            </div>
            <span style={{ color: '#ffaa44', fontSize: 16, fontWeight: 'bold', fontFamily: 'monospace' }}>
              = {result?.roll}
            </span>
          </div>

          {result?.event ? (
            <div style={s.eventBox}>
              <div style={s.eventName}>{result.event.name}</div>
              <div style={s.eventDesc}>{result.event.description}</div>
            </div>
          ) : (
            <div style={s.noEvent}>
              Roll {result?.roll}: No event this turn.
            </div>
          )}

          <div style={s.ruleRef}>Advance to the next phase to continue.</div>
        </>
      )}
    </div>
  );
};

export default RandomEventPanel;
