/**
 * SAM Acquisition Phase and SAM Location Phase panel.
 */

import React, { useState, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import { playDiceRoll, playSAMAcquisition } from '../../audio';
import {
  runSAMAcquisitionPhase,
  applyAcquisitionResults,
  AcquisitionResult,
} from '@engine/rules/sam';
import { AcquisitionLevel } from '@engine/state/GameState';

const s: Record<string, React.CSSProperties> = {
  panel: {
    backgroundColor: '#1a1a2e',
    borderRadius: 4,
    border: '1px solid #0f3460',
    marginTop: 8,
    padding: 12,
  },
  title: {
    color: '#ff8844',
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  text: {
    color: '#ccc',
    fontSize: 12,
    lineHeight: 1.6,
    marginBottom: 8,
  },
  btn: {
    display: 'block',
    width: '100%',
    padding: '8px 12px',
    marginTop: 6,
    backgroundColor: '#0f3460',
    color: '#e0e0e0',
    border: '1px solid #1a4a80',
    borderRadius: 4,
    fontSize: 12,
    cursor: 'pointer',
    textAlign: 'center' as const,
  },
  btnPrimary: {
    backgroundColor: '#ff8844',
    color: '#000',
    fontWeight: 'bold',
    border: '1px solid #ff8844',
  },
  resultRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 8px',
    marginTop: 4,
    borderRadius: 3,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  acquired: {
    backgroundColor: '#332211',
    border: '1px solid #664422',
  },
  notAcquired: {
    backgroundColor: '#1a1a28',
    border: '1px solid #333355',
  },
  summary: {
    backgroundColor: '#0a1628',
    border: '1px solid #1a4a80',
    borderRadius: 4,
    padding: '8px 10px',
    marginTop: 8,
    fontSize: 12,
    color: '#aaa',
  },
};

const ACQ_LABELS: Record<AcquisitionLevel, { text: string; color: string }> = {
  none: { text: 'NO ACQ', color: '#666' },
  partial: { text: 'PARTIAL', color: '#ffaa44' },
  full: { text: 'FULL', color: '#ff4444' },
};

const SAMPanel: React.FC = () => {
  const { gameState, updateGameState } = useGameStore();
  const [acqResults, setAcqResults] = useState<AcquisitionResult[] | null>(null);

  const isSAMAcqPhase = gameState.phase === 'samAcquisition';
  const isSAMLocPhase = gameState.phase === 'samLocation';

  // Count active SAMs
  const activeSAMs = Object.values(gameState.groundUnits).filter(
    (u) => u.type === 'sam' && u.radarOn && u.damage !== 'destroyed' && u.damage !== 'heavy'
  );

  // ── SAM Acquisition ──
  const handleRunAcquisition = useCallback(() => {
    playDiceRoll();
    const natoResults = runSAMAcquisitionPhase(gameState, 'nato');
    const wpResults = runSAMAcquisitionPhase(gameState, 'wp');
    const allResults = [...natoResults, ...wpResults];
    if (allResults.some((r) => r.result !== 'none')) playSAMAcquisition();

    setAcqResults(allResults);
    updateGameState((state) => applyAcquisitionResults(state, allResults));
  }, [gameState, updateGameState]);

  if (isSAMAcqPhase) {
    return (
      <div style={s.panel}>
        <div style={s.title}>SAM Acquisition Phase</div>
        <div style={s.text}>
          {activeSAMs.length} active SAM(s) attempt to acquire or maintain acquisition on enemy flights.
        </div>

        {!acqResults && (
          <button style={{ ...s.btn, ...s.btnPrimary }} onClick={handleRunAcquisition}>
            Resolve SAM Acquisition
          </button>
        )}

        {acqResults && (
          <>
            {acqResults.length === 0 && (
              <div style={s.summary}>No acquisition attempts possible.</div>
            )}
            {acqResults.map((r, i) => {
              const acqInfo = ACQ_LABELS[r.result];
              const prevInfo = ACQ_LABELS[r.previousLevel];
              return (
                <div
                  key={i}
                  style={{
                    ...s.resultRow,
                    ...(r.result !== 'none' ? s.acquired : s.notAcquired),
                  }}
                >
                  <span style={{ color: '#aaa' }}>
                    {r.samId} → {r.targetId}
                  </span>
                  <span>
                    Roll: {r.roll} vs {r.needed}
                    {r.previousLevel !== 'none' && (
                      <span style={{ color: prevInfo.color }}> [{prevInfo.text}]</span>
                    )}
                    {' → '}
                    <span style={{ color: acqInfo.color, fontWeight: 'bold' }}>
                      {acqInfo.text}
                    </span>
                  </span>
                </div>
              );
            })}
            <div style={s.summary}>
              {acqResults.filter((r) => r.result !== 'none').length} acquisition(s) achieved.
            </div>
          </>
        )}
      </div>
    );
  }

  if (isSAMLocPhase) {
    return (
      <div style={s.panel}>
        <div style={s.title}>SAM Location Phase</div>
        <div style={s.text}>
          Attempt to locate unlocated SAMs using RWR-equipped flights.
        </div>
        <div style={s.summary}>
          SAM location attempts resolved automatically.
        </div>
      </div>
    );
  }

  return null;
};

export default SAMPanel;
