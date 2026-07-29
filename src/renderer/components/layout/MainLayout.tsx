import React, { useEffect, useState } from 'react';
import Toolbar from './Toolbar';
import PhaseBar from './PhaseBar';
import HexMapView from '../map/HexMapView';
import FlightLogPanel from '../panels/FlightLogPanel';
import MovementPanel from '../panels/MovementPanel';
import DetectionPanel from '../panels/DetectionPanel';
import SAMPanel from '../panels/SAMPanel';
import SetupPanel from '../panels/SetupPanel';
import RandomEventPanel from '../panels/RandomEventPanel';
import ScenarioCompletePanel from '../panels/ScenarioCompletePanel';
import PhaseGuide from '../tutorial/PhaseGuide';
import RuleReference from '../tutorial/RuleReference';
import TutorialOverlay from '../tutorial/TutorialOverlay';
import TutorialSelect from '../tutorial/TutorialSelect';
import { getTutorial } from '@tutorial/tutorials/tutorialDefinitions';
import { loadScenario } from '@engine/scenarioLoader';
import EventLogPanel from '../panels/EventLogPanel';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { useMovementStore } from '../../store/movementStore';

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a2e',
  },
  main: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  mapArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  sidebar: {
    width: 320,
    backgroundColor: '#16213e',
    borderLeft: '1px solid #0f3460',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sidebarHeader: {
    padding: '12px 16px',
    backgroundColor: '#0f3460',
    color: '#e94560',
    fontWeight: 'bold',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sidebarContent: {
    flex: 1,
    padding: 16,
    overflowY: 'auto',
    fontSize: 13,
    lineHeight: 1.6,
  },
  hexInfo: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#1a1a2e',
    borderRadius: 4,
    border: '1px solid #0f3460',
  },
  label: {
    color: '#888',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    color: '#e0e0e0',
    fontSize: 14,
    marginTop: 2,
  },
  welcomeOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    color: '#e94560',
    pointerEvents: 'none',
  },
  welcomeTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    letterSpacing: 4,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#888',
    letterSpacing: 2,
  },
};

const MainLayout: React.FC = () => {
  const { gameActive, gameState, startGame } = useGameStore();
  const { selectedHex, selectedFlightId, selectFlight, panels } = useUIStore();
  const movementStore = useMovementStore();
  const [showRuleRef, setShowRuleRef] = useState(false);
  const [showTutorialSelect, setShowTutorialSelect] = useState(false);
  const [activeTutorial, setActiveTutorial] = useState<string | null>(null);

  // Auto-enter movement flow when phase changes to 'movement'
  useEffect(() => {
    if (gameState.phase === 'movement' && movementStore.step === 'idle') {
      movementStore.setStep('rollInitiative');
    } else if (gameState.phase !== 'movement' && movementStore.step !== 'idle') {
      movementStore.reset();
    }
  }, [gameState.phase, movementStore]);

  return (
    <div style={styles.container}>
      <Toolbar />

      <div style={styles.main}>
        {/* Map Area */}
        <div style={styles.mapArea}>
          <HexMapView />
          {!gameActive && (
            <div style={styles.welcomeOverlay}>
              <div style={styles.welcomeTitle}>RED STORM</div>
              <div style={styles.welcomeSubtitle}>
                AIR COMBAT OVER THE CENTRAL FRONT, 1987
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            {gameActive ? `Turn ${gameState.turn} — ${formatPhase(gameState.phase)}` : 'Red Storm'}
          </div>
          <div style={styles.sidebarContent}>
            {!gameActive && (
              <div>
                <p style={{ color: '#aaa', marginBottom: 12 }}>
                  Welcome to Red Storm Digital. Select a scenario from the toolbar to begin.
                </p>
                <p style={{ color: '#666', fontSize: 12, marginBottom: 16 }}>
                  Red Storm simulates air warfare over central Germany in a hypothetical 1987 NATO
                  vs. Warsaw Pact conflict. You will command flights of aircraft, navigate enemy air
                  defenses, and strike targets deep behind enemy lines.
                </p>
                <button
                  style={{ ...styles.hexInfo, cursor: 'pointer', border: '1px solid #44cc88', color: '#44cc88', fontSize: 13, fontWeight: 'bold', textAlign: 'center', padding: 10, marginBottom: 8, display: 'block', width: '100%', backgroundColor: '#1a2a1e' } as React.CSSProperties}
                  onClick={() => setShowTutorialSelect(true)}
                >
                  Start a Tutorial
                </button>
                <button
                  style={{ ...styles.hexInfo, cursor: 'pointer', border: '1px solid #44aaff', color: '#44aaff', fontSize: 13, textAlign: 'center', padding: 10, display: 'block', width: '100%', backgroundColor: '#1a1a2e' } as React.CSSProperties}
                  onClick={() => setShowRuleRef(true)}
                >
                  Browse Rules Reference
                </button>
              </div>
            )}

            {gameActive && selectedHex && (() => {
              const hexId = selectedHex.col.toString().padStart(2, '0') +
                selectedHex.row.toString().padStart(2, '0');
              const hexData = gameState.hexes[hexId];
              const flightsHere = Object.values(gameState.flights).filter(
                (f) => f.hex.col === selectedHex.col && f.hex.row === selectedHex.row
              );
              const unitsHere = Object.values(gameState.groundUnits).filter(
                (u) => u.hex.col === selectedHex.col && u.hex.row === selectedHex.row && !u.hidden
              );

              return (
                <div style={styles.hexInfo}>
                  <div style={styles.label}>Selected Hex</div>
                  <div style={styles.value}>{hexId}</div>

                  {hexData && (
                    <>
                      <div style={{ ...styles.label, marginTop: 8 }}>Terrain</div>
                      <div style={styles.value}>{hexData.terrain.join(', ')}</div>
                      {hexData.isAirfield && (
                        <div style={{ ...styles.value, color: '#4488cc' }}>
                          Airfield: {hexData.airfieldId} (Class {hexData.airfieldClass})
                        </div>
                      )}
                      <div style={{ ...styles.value, fontSize: 11, color: '#888' }}>
                        {hexData.isEastGermany ? 'East Germany' : 'West Germany'}
                      </div>
                    </>
                  )}

                  {flightsHere.length > 0 && (
                    <>
                      <div style={{ ...styles.label, marginTop: 8 }}>Flights</div>
                      {flightsHere.map((f) => (
                        <div key={f.id} style={{ ...styles.value, fontSize: 12 }}>
                          <span style={{ color: f.side === 'nato' ? '#6699ee' : '#ee6666' }}>
                            {f.id}
                          </span>
                          {' — '}
                          {f.aircraft.filter((a) => a.damage !== 'shotdown').length}x {f.aircraftType}
                          {' @ '}{f.altitude.toUpperCase()}
                          {f.detected ? ' [DET]' : ' [UNDET]'}
                        </div>
                      ))}
                    </>
                  )}

                  {unitsHere.length > 0 && (
                    <>
                      <div style={{ ...styles.label, marginTop: 8 }}>Ground Units</div>
                      {unitsHere.map((u) => (
                        <div key={u.id} style={{ ...styles.value, fontSize: 12 }}>
                          <span style={{ color: u.side === 'nato' ? '#6699ee' : '#ee6666' }}>
                            {u.id}
                          </span>
                          {' — '}{u.subType}
                          {u.radarOn ? ' [RADAR ON]' : ''}
                          {u.damage !== 'none' ? ` [${u.damage.toUpperCase()}]` : ''}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              );
            })()}

            {gameActive && panels.phaseGuide && (
              <PhaseGuide />
            )}

            {/* Phase-specific Panels */}
            {gameActive && gameState.phase === 'setup' && (
              <SetupPanel />
            )}
            {gameActive && gameState.phase === 'randomEvent' && (
              <RandomEventPanel />
            )}
            {gameActive && (gameState.phase === 'detection' || gameState.phase === 'track') && (
              <DetectionPanel />
            )}
            {gameActive && gameState.phase === 'movement' && (
              <MovementPanel />
            )}
            {gameActive && (gameState.phase === 'samAcquisition' || gameState.phase === 'samLocation') && (
              <SAMPanel />
            )}
            {gameActive && gameState.phase === 'completed' && (
              <ScenarioCompletePanel />
            )}

            {/* Event Log Panel */}
            {gameActive && panels.eventLog && (
              <EventLogPanel />
            )}

            {/* Flight Log Panels */}
            {gameActive && panels.flightLog && (
              <div style={{ marginTop: 12 }}>
                <div style={styles.label}>Flights</div>
                {Object.values(gameState.flights).map((flight) => (
                  <FlightLogPanel
                    key={flight.id}
                    flight={flight}
                    isSelected={selectedFlightId === flight.id}
                    onClick={() => selectFlight(
                      selectedFlightId === flight.id ? null : flight.id
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {gameActive && <PhaseBar />}

      {/* Tutorial Overlay */}
      {activeTutorial && (
        <TutorialOverlay
          tutorialId={activeTutorial}
          onClose={() => setActiveTutorial(null)}
          onComplete={() => setActiveTutorial(null)}
        />
      )}

      {/* Tutorial Select */}
      {showTutorialSelect && (
        <TutorialSelect
          onSelect={(id) => {
            const tut = getTutorial(id);
            if (tut) {
              try {
                const state = loadScenario(tut.scenarioId);
                startGame(state);
              } catch (e) {
                console.error('Failed to load tutorial scenario:', e);
              }
            }
            setActiveTutorial(id);
            setShowTutorialSelect(false);
          }}
          onClose={() => setShowTutorialSelect(false)}
        />
      )}

      {/* Rule Reference */}
      {showRuleRef && (
        <RuleReference onClose={() => setShowRuleRef(false)} />
      )}
    </div>
  );
};

function formatPhase(phase: string): string {
  const labels: Record<string, string> = {
    setup: 'Setup',
    randomEvent: 'Random Event',
    jamming: 'Jamming',
    detection: 'Detection',
    movement: 'Movement',
    fuel: 'Fuel',
    samLocation: 'SAM Location',
    track: 'Track',
    samAcquisition: 'SAM Acquisition',
    admin: 'Admin',
    completed: 'Scenario Complete',
  };
  return labels[phase] || phase;
}

export default MainLayout;
