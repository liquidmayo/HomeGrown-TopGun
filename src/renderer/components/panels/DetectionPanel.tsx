/**
 * Detection Phase and Track Phase control panel.
 *
 * Displays detection attempts and results, and allows
 * the player to step through the detection process.
 */

import React, { useState, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import { playDetectionPing, playDiceRoll } from '../../audio';
import {
  runDetectionPhase,
  applyDetectionResults,
  applyTrackPhase,
  DetectionResult,
} from '@engine/rules/detection';

const s: Record<string, React.CSSProperties> = {
  panel: {
    backgroundColor: '#1a1a2e',
    borderRadius: 4,
    border: '1px solid #0f3460',
    marginTop: 8,
    padding: 12,
  },
  title: {
    color: '#44aaff',
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
    backgroundColor: '#44aaff',
    color: '#000',
    fontWeight: 'bold',
    border: '1px solid #44aaff',
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
  detected: {
    backgroundColor: '#1a3322',
    border: '1px solid #2a6622',
    color: '#66cc66',
  },
  notDetected: {
    backgroundColor: '#1a1a28',
    border: '1px solid #333355',
    color: '#888',
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
  method: {
    color: '#888',
    fontSize: 10,
    textTransform: 'uppercase' as const,
  },
};

const METHOD_LABELS: Record<string, string> = {
  standard: 'STD',
  visual: 'VIS',
  radar: 'RDR',
  ewr: 'EWR',
};

const DetectionPanel: React.FC = () => {
  const { gameState, updateGameState } = useGameStore();
  const [results, setResults] = useState<DetectionResult[] | null>(null);
  const [trackDone, setTrackDone] = useState(false);
  const [trackInfo, setTrackInfo] = useState<string[]>([]);

  const isDetectionPhase = gameState.phase === 'detection';
  const isTrackPhase = gameState.phase === 'track';

  // ── Detection Phase ──
  const handleRunDetection = useCallback(() => {
    playDiceRoll();
    const detResults = runDetectionPhase(gameState);
    setResults(detResults);
    if (detResults.some((r) => r.detected)) playDetectionPing();

    // Apply results to game state
    updateGameState((state) => applyDetectionResults(state, detResults));
  }, [gameState, updateGameState]);

  // ── Track Phase ──
  const handleRunTrack = useCallback(() => {
    const { state, autoUndetected, trackResult } = applyTrackPhase(gameState);
    updateGameState(() => state);

    const info: string[] = [];
    if (autoUndetected.length > 0) {
      info.push(`Auto-undetected (Deck/terrain): ${autoUndetected.join(', ')}`);
    }
    info.push(`Track roll: ${trackResult.roll}`);
    if (trackResult.symbols.length > 0) {
      info.push(`Undetected symbols: ${trackResult.symbols.join(', ')}`);
    } else if (trackResult.restrictedSymbols.length > 0) {
      info.push(`Restricted undetect: ${trackResult.restrictedSymbols.join(', ')}`);
    } else {
      info.push('No flights lost tracking');
    }
    setTrackInfo(info);
    setTrackDone(true);
  }, [gameState, updateGameState]);

  // Count undetected enemy flights
  const undetectedCount = Object.values(gameState.flights).filter(
    (f) => !f.detected && f.side !== gameState.humanSide
  ).length;

  const detectedCount = Object.values(gameState.flights).filter(
    (f) => f.detected && f.side !== gameState.humanSide
  ).length;

  // ── Render Detection Phase ──
  if (isDetectionPhase) {
    return (
      <div style={s.panel}>
        <div style={s.title}>Detection Phase</div>

        <div style={s.text}>
          Attempt to detect {undetectedCount} undetected enemy flight(s).
          {detectedCount > 0 && ` (${detectedCount} already detected)`}
        </div>

        {!results && (
          <button style={{ ...s.btn, ...s.btnPrimary }} onClick={handleRunDetection}>
            Roll Detection Attempts
          </button>
        )}

        {results && (
          <>
            {results.map((r, i) => {
              const flight = gameState.flights[r.targetId];
              return (
                <div
                  key={i}
                  style={{
                    ...s.resultRow,
                    ...(r.detected ? s.detected : s.notDetected),
                  }}
                >
                  <span>
                    <span style={s.method}>[{METHOD_LABELS[r.method]}]</span>
                    {' '}{r.targetId}
                    {flight ? ` (${flight.aircraftType})` : ''}
                  </span>
                  <span>
                    {r.roll} vs {r.needed}
                    {' → '}
                    <strong>{r.detected ? 'DETECTED' : 'No effect'}</strong>
                  </span>
                </div>
              );
            })}

            <div style={s.summary}>
              {results.filter((r) => r.detected).length} of{' '}
              {new Set(results.map((r) => r.targetId)).size} flight(s) detected.
              Advance to next phase.
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Render Track Phase ──
  if (isTrackPhase) {
    return (
      <div style={s.panel}>
        <div style={s.title}>Track Phase</div>

        <div style={s.text}>
          Roll to determine if detected enemy flights become undetected.
          {detectedCount > 0 ? ` ${detectedCount} detected flight(s) to track.` : ' No detected flights.'}
        </div>

        {!trackDone && (
          <button style={{ ...s.btn, ...s.btnPrimary }} onClick={handleRunTrack}>
            Roll Track Table
          </button>
        )}

        {trackDone && (
          <div style={s.summary}>
            {trackInfo.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default DetectionPanel;
