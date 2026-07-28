import React, { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useGameStore } from '../../store/gameStore';
import { loadScenario } from '@engine/scenarioLoader';
import ScenarioSelectScreen from '../scenario/ScenarioSelectScreen';
import { saveGame, loadGameFromStorage } from '../../store/saveLoad';
import { pushUndoState, popUndoState, canUndo } from '@engine/controller/UndoManager';

const styles: Record<string, React.CSSProperties> = {
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    height: 44,
    backgroundColor: '#0f3460',
    borderBottom: '2px solid #e94560',
    padding: '0 16px',
    gap: 8,
  },
  title: {
    color: '#e94560',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 2,
    marginRight: 24,
  },
  button: {
    backgroundColor: '#16213e',
    color: '#e0e0e0',
    border: '1px solid #0f3460',
    borderRadius: 4,
    padding: '6px 12px',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  buttonActive: {
    backgroundColor: '#e94560',
    color: '#fff',
    border: '1px solid #e94560',
  },
  spacer: {
    flex: 1,
  },
  tipsLabel: {
    color: '#888',
    fontSize: 11,
    marginRight: 4,
  },
};

const Toolbar: React.FC = () => {
  const { tipsEnabled, toggleTips, togglePanel, panels } = useUIStore();
  const { gameActive, gameState, startGame, updateGameState } = useGameStore();
  const [showScenarioSelect, setShowScenarioSelect] = useState(false);

  const handleSelectScenario = (scenarioId: string) => {
    try {
      const state = loadScenario(scenarioId);
      startGame(state);
      setShowScenarioSelect(false);
    } catch (err) {
      console.error('Failed to load scenario:', err);
    }
  };

  return (
    <div style={styles.toolbar}>
      <div style={styles.title}>RED STORM</div>

      <button
        style={{ ...styles.button, ...styles.buttonActive }}
        onClick={() => setShowScenarioSelect(true)}
        title="Select a scenario to play"
      >
        New Game
      </button>

      {gameActive && (
        <>
          <button
            style={styles.button}
            onClick={async () => {
              const ok = await saveGame(gameState);
              if (ok) {
                updateGameState((s) => ({
                  ...s,
                  eventLog: [...s.eventLog, { turn: s.turn, phase: s.phase, timestamp: Date.now(), type: 'save', message: 'Game saved.' }],
                }));
              }
            }}
            title="Save current game"
          >
            Save
          </button>
          <button
            style={styles.button}
            onClick={() => {
              const state = loadGameFromStorage();
              if (state) startGame(state);
            }}
            title="Load last saved game"
          >
            Load
          </button>
          <button
            style={{
              ...styles.button,
              opacity: canUndo(gameState) ? 1 : 0.4,
            }}
            onClick={() => {
              const prev = popUndoState(gameState);
              if (prev) startGame(prev);
            }}
            disabled={!canUndo(gameState)}
            title={`Undo (${gameState.undoStack.length} steps)`}
          >
            Undo
          </button>
        </>
      )}

      <div style={styles.spacer} />

      {gameActive && (
        <>
          <button
            style={{
              ...styles.button,
              ...(panels.phaseGuide ? styles.buttonActive : {}),
            }}
            onClick={() => togglePanel('phaseGuide')}
            title="Toggle Phase Guide — explains what to do in the current phase"
          >
            Phase Guide
          </button>
          <button
            style={{
              ...styles.button,
              ...(panels.eventLog ? styles.buttonActive : {}),
            }}
            onClick={() => togglePanel('eventLog')}
            title="Toggle Event Log"
          >
            Event Log
          </button>
        </>
      )}

      <button
        style={{
          ...styles.button,
          ...(panels.ruleReference ? styles.buttonActive : {}),
        }}
        onClick={() => togglePanel('ruleReference')}
        title="Open the searchable rule reference"
      >
        Rules
      </button>

      <span style={styles.tipsLabel}>Tips</span>
      <button
        style={{
          ...styles.button,
          ...(tipsEnabled ? styles.buttonActive : {}),
          padding: '6px 10px',
        }}
        onClick={toggleTips}
        title="Toggle contextual tips and tooltips"
      >
        {tipsEnabled ? 'ON' : 'OFF'}
      </button>

      {showScenarioSelect && (
        <ScenarioSelectScreen
          onSelectScenario={handleSelectScenario}
          onClose={() => setShowScenarioSelect(false)}
        />
      )}
    </div>
  );
};

export default Toolbar;
