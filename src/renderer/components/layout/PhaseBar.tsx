import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { GamePhase } from '@engine/state/GameState';
import { advancePhase } from '@engine/controller/PhaseStateMachine';
import { pushUndoState } from '@engine/controller/UndoManager';

const PHASE_ORDER: { phase: GamePhase; label: string }[] = [
  { phase: 'randomEvent', label: 'Random Event' },
  { phase: 'jamming', label: 'Jamming' },
  { phase: 'detection', label: 'Detection' },
  { phase: 'movement', label: 'Movement' },
  { phase: 'fuel', label: 'Fuel' },
  { phase: 'samLocation', label: 'SAM Location' },
  { phase: 'track', label: 'Track' },
  { phase: 'samAcquisition', label: 'SAM Acquisition' },
  { phase: 'admin', label: 'Admin' },
];

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    height: 36,
    backgroundColor: '#16213e',
    borderTop: '1px solid #0f3460',
    padding: '0 16px',
    gap: 4,
  },
  turnLabel: {
    color: '#e94560',
    fontWeight: 'bold',
    fontSize: 12,
    marginRight: 16,
    minWidth: 70,
  },
  phaseChip: {
    padding: '4px 10px',
    fontSize: 11,
    borderRadius: 3,
    color: '#666',
    backgroundColor: '#1a1a2e',
    border: '1px solid #0f3460',
    transition: 'all 0.15s',
  },
  phaseChipActive: {
    color: '#fff',
    backgroundColor: '#e94560',
    border: '1px solid #e94560',
    fontWeight: 'bold',
  },
  phaseChipCompleted: {
    color: '#4a9',
    border: '1px solid #4a9',
  },
  spacer: {
    flex: 1,
  },
  advanceButton: {
    backgroundColor: '#e94560',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '6px 16px',
    fontSize: 12,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};

const PhaseBar: React.FC = () => {
  const { gameState, updateGameState } = useGameStore();

  const handleNextPhase = () => {
    updateGameState((state) => {
      const withUndo = pushUndoState(state);
      return advancePhase(withUndo);
    });
  };
  const currentPhaseIndex = PHASE_ORDER.findIndex(
    (p) => p.phase === gameState.phase
  );

  return (
    <div style={styles.bar}>
      <div style={styles.turnLabel}>Turn {gameState.turn}</div>
      {PHASE_ORDER.map((p, i) => {
        const isActive = p.phase === gameState.phase;
        const isCompleted = i < currentPhaseIndex;
        return (
          <div
            key={p.phase}
            style={{
              ...styles.phaseChip,
              ...(isActive ? styles.phaseChipActive : {}),
              ...(isCompleted ? styles.phaseChipCompleted : {}),
            }}
          >
            {p.label}
          </div>
        );
      })}
      <div style={styles.spacer} />
      <button
        style={styles.advanceButton}
        onClick={handleNextPhase}
        title="Advance to the next phase"
        disabled={gameState.phase === 'completed'}
      >
        {gameState.phase === 'admin' ? 'End Turn →' : 'Next Phase →'}
      </button>
    </div>
  );
};

export default PhaseBar;
