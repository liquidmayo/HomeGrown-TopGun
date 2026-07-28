/**
 * Setup / Ground Planning Phase panel.
 *
 * Allows the player to review and adjust ground unit placement
 * during the scenario setup phase. Shows the OOB and lets the
 * player confirm unit positions.
 *
 * Reference: Rules section 31.0
 */

import React, { useState, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { HexCoord, hexToId, GroundUnitState, FlightState } from '@engine/state/GameState';

const s: Record<string, React.CSSProperties> = {
  panel: {
    backgroundColor: '#1a1a2e', borderRadius: 4, border: '1px solid #0f3460',
    marginTop: 8, padding: 12, maxHeight: 500, overflowY: 'auto',
  },
  title: {
    color: '#e94560', fontWeight: 'bold', fontSize: 13, marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  sectionTitle: {
    color: '#44aaff', fontWeight: 'bold', fontSize: 11, marginTop: 10,
    marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1,
    borderBottom: '1px solid #0f3460', paddingBottom: 2,
  },
  text: { color: '#ccc', fontSize: 12, lineHeight: 1.6, marginBottom: 8 },
  unitRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '4px 8px', marginBottom: 3, borderRadius: 3,
    fontSize: 11, fontFamily: 'monospace',
    border: '1px solid #0f3460', backgroundColor: '#0a1628',
  },
  unitRowSelected: {
    border: '1px solid #e94560', backgroundColor: '#1a0a18',
  },
  unitId: { color: '#ddd', fontWeight: 'bold', minWidth: 60 },
  unitType: { color: '#888', minWidth: 70 },
  unitHex: { color: '#44aaff', minWidth: 40 },
  unitStatus: { fontSize: 10 },
  btn: {
    display: 'block', width: '100%', padding: '8px 12px', marginTop: 8,
    backgroundColor: '#0f3460', color: '#e0e0e0', border: '1px solid #1a4a80',
    borderRadius: 4, fontSize: 12, cursor: 'pointer', textAlign: 'center' as const,
  },
  btnPrimary: {
    backgroundColor: '#e94560', color: '#fff', border: '1px solid #e94560', fontWeight: 'bold',
  },
  btnSmall: {
    display: 'inline-block', width: 'auto', padding: '2px 8px',
    fontSize: 10, marginLeft: 4,
  },
  info: {
    backgroundColor: '#0a1628', border: '1px solid #1a4a80', borderRadius: 4,
    padding: '6px 10px', marginTop: 6, fontSize: 11, color: '#aaa',
  },
  side: { nato: '#4488cc', wp: '#cc4444' },
};

const UNIT_TYPE_LABELS: Record<string, string> = {
  sam: 'SAM', ewr: 'EWR', aaaConcentation: 'AAA', radarAAA: 'Fire Can',
  mobileAAA: 'Mobile AAA', armor: 'Armor', mech: 'Mech', artillery: 'Artillery',
  hq: 'HQ', supply: 'Supply', missile: 'Missile',
};

const SetupPanel: React.FC = () => {
  const { gameState, updateGameState } = useGameStore();
  const { selectedHex, selectHex } = useUIStore();
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [placingUnit, setPlacingUnit] = useState(false);

  const humanUnits = Object.values(gameState.groundUnits).filter(
    (u) => u.side === gameState.humanSide
  );
  const botUnits = Object.values(gameState.groundUnits).filter(
    (u) => u.side === gameState.botSide
  );
  const humanFlights = Object.values(gameState.flights).filter(
    (f) => f.side === gameState.humanSide
  );
  const botFlights = Object.values(gameState.flights).filter(
    (f) => f.side === gameState.botSide
  );

  // Handle placing a unit at the selected hex
  const handlePlaceUnit = useCallback(() => {
    if (!selectedUnitId || !selectedHex) return;

    updateGameState((state) => {
      const unit = state.groundUnits[selectedUnitId];
      if (!unit) return state;

      return {
        ...state,
        groundUnits: {
          ...state.groundUnits,
          [selectedUnitId]: { ...unit, hex: selectedHex },
        },
        eventLog: [
          ...state.eventLog,
          {
            turn: 0, phase: 'setup', timestamp: Date.now(),
            type: 'unit_placed',
            message: `${unit.subType} (${selectedUnitId}) placed at ${hexToId(selectedHex)}`,
          },
        ],
      };
    });

    setPlacingUnit(false);
    setSelectedUnitId(null);
  }, [selectedUnitId, selectedHex, updateGameState]);

  // Toggle radar for a unit
  const handleToggleRadar = useCallback((unitId: string) => {
    updateGameState((state) => {
      const unit = state.groundUnits[unitId];
      if (!unit) return state;
      return {
        ...state,
        groundUnits: {
          ...state.groundUnits,
          [unitId]: { ...unit, radarOn: !unit.radarOn },
        },
      };
    });
  }, [updateGameState]);

  const renderUnitRow = (unit: GroundUnitState, isHuman: boolean) => {
    const isSelected = selectedUnitId === unit.id;
    return (
      <div
        key={unit.id}
        style={{ ...s.unitRow, ...(isSelected ? s.unitRowSelected : {}) }}
        onClick={() => {
          setSelectedUnitId(isSelected ? null : unit.id);
          selectHex(unit.hex);
        }}
      >
        <span style={s.unitId}>{unit.id}</span>
        <span style={s.unitType}>{unit.subType}</span>
        <span style={s.unitHex}>{hexToId(unit.hex)}</span>
        <span style={{ ...s.unitStatus, color: unit.radarOn ? '#44ff44' : '#666' }}>
          {(unit.type === 'sam' || unit.type === 'ewr') ? (unit.radarOn ? 'ON' : 'OFF') : ''}
        </span>
        {isHuman && (
          <>
            {(unit.type === 'sam' || unit.type === 'ewr' || unit.type === 'radarAAA') && (
              <button style={{ ...s.btn, ...s.btnSmall }} onClick={(e) => { e.stopPropagation(); handleToggleRadar(unit.id); }}>
                Radar
              </button>
            )}
            <button
              style={{ ...s.btn, ...s.btnSmall }}
              onClick={(e) => { e.stopPropagation(); setSelectedUnitId(unit.id); setPlacingUnit(true); }}
            >
              Move
            </button>
          </>
        )}
      </div>
    );
  };

  const renderFlightRow = (flight: FlightState) => (
    <div key={flight.id} style={s.unitRow}>
      <span style={s.unitId}>{flight.id}</span>
      <span style={s.unitType}>{flight.aircraftType} x{flight.aircraft.length}</span>
      <span style={s.unitHex}>{hexToId(flight.hex)}</span>
      <span style={{ ...s.unitStatus, color: '#aaa' }}>
        {flight.task.toUpperCase()} @ {flight.altitude.toUpperCase()}
      </span>
    </div>
  );

  return (
    <div style={s.panel}>
      <div style={s.title}>Scenario Setup</div>

      <div style={s.text}>
        <strong>{gameState.scenarioName}</strong><br />
        Review your order of battle. Click a ground unit to select it on the map.
        Use "Move" to reposition units, then click a hex on the map.
      </div>

      {placingUnit && selectedUnitId && (
        <div style={{ ...s.info, borderColor: '#e94560' }}>
          Click a hex on the map to place <strong>{selectedUnitId}</strong>,
          then press the button below.
          {selectedHex && (
            <button style={{ ...s.btn, ...s.btnPrimary, marginTop: 4 }} onClick={handlePlaceUnit}>
              Place at {hexToId(selectedHex)}
            </button>
          )}
          <button style={{ ...s.btn, marginTop: 4 }} onClick={() => { setPlacingUnit(false); setSelectedUnitId(null); }}>
            Cancel
          </button>
        </div>
      )}

      {/* Your Forces */}
      <div style={s.sectionTitle}>
        <span style={{ color: gameState.humanSide === 'nato' ? s.side.nato : s.side.wp }}>
          Your Forces ({gameState.humanSide.toUpperCase()})
        </span>
      </div>

      {humanFlights.length > 0 && (
        <>
          <div style={{ color: '#888', fontSize: 10, marginBottom: 2 }}>FLIGHTS ({humanFlights.length})</div>
          {humanFlights.map((f) => renderFlightRow(f))}
        </>
      )}

      {humanUnits.length > 0 && (
        <>
          <div style={{ color: '#888', fontSize: 10, marginTop: 6, marginBottom: 2 }}>
            GROUND UNITS ({humanUnits.length}) — click to select, "Move" to reposition
          </div>
          {humanUnits.map((u) => renderUnitRow(u, true))}
        </>
      )}

      {/* Enemy Forces */}
      <div style={s.sectionTitle}>
        <span style={{ color: gameState.botSide === 'nato' ? s.side.nato : s.side.wp }}>
          Enemy Forces ({gameState.botSide.toUpperCase()}) — AI Controlled
        </span>
      </div>

      {botFlights.length > 0 && (
        <>
          <div style={{ color: '#888', fontSize: 10, marginBottom: 2 }}>FLIGHTS ({botFlights.length})</div>
          {botFlights.map((f) => renderFlightRow(f))}
        </>
      )}

      {botUnits.length > 0 && (
        <>
          <div style={{ color: '#888', fontSize: 10, marginTop: 6, marginBottom: 2 }}>GROUND UNITS ({botUnits.length})</div>
          {botUnits.map((u) => renderUnitRow(u, false))}
        </>
      )}

      <div style={s.info}>
        Scenario: {gameState.scenarioName}<br />
        Play area: cols {Object.keys(gameState.hexes).length > 0 ? `${Math.min(...Object.keys(gameState.hexes).map(h => parseInt(h.substring(0,2))))}–${Math.max(...Object.keys(gameState.hexes).map(h => parseInt(h.substring(0,2))))}` : '?'},
        rows {Object.keys(gameState.hexes).length > 0 ? `${Math.min(...Object.keys(gameState.hexes).map(h => parseInt(h.substring(2,4))))}–${Math.max(...Object.keys(gameState.hexes).map(h => parseInt(h.substring(2,4))))}` : '?'}<br />
        Detection: NATO {gameState.natoDetectionLevel} / WP {gameState.wpDetectionLevel}<br />
        {gameState.maxTurns ? `Max turns: ${gameState.maxTurns}` : 'No turn limit'}
      </div>

      <button
        style={{ ...s.btn, ...s.btnPrimary, marginTop: 10 }}
        onClick={() => {
          updateGameState((state) => ({
            ...state,
            eventLog: [...state.eventLog, {
              turn: 0, phase: 'setup', timestamp: Date.now(),
              type: 'setup_complete', message: 'Setup complete. Advancing to first game phase.',
            }],
          }));
        }}
      >
        Confirm Setup — Begin Scenario
      </button>
    </div>
  );
};

export default SetupPanel;
