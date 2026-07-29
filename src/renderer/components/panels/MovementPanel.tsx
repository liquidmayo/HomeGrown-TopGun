/**
 * Movement Phase control panel.
 *
 * Guides the player through the Movement Phase flow:
 * Roll Initiative → Draw Chit → Select Flight → Set Speed → Move → Repeat
 */

import React, { useCallback, useMemo, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useMovementStore, ValidMoveHex } from '../../store/movementStore';
import { useUIStore } from '../../store/uiStore';
import { rollInitiative, executeChitDraw, getMovableFlights, getNextChitDrawSide, countUnmovedFlights } from '@engine/rules/initiative';
import { getSpeedRange, getValidActions, initializeMovement, isFlightLaden } from '@engine/rules/movement';
import { getAircraftData, getSpeed } from '@data/aircraft/aircraftDatabase';
import { getNeighbor, hexToPixel, hexDistance } from '@engine/hex';
import { FlightState, Throttle, hexToId, Side } from '@engine/state/GameState';
import { isInBarrageZone, resolveAAABarrage, resolveFireCanAttack, resolveMobileAAAAttack } from '@engine/rules/aaa';
import { allocateDamage, checkStandardEngagementPrereqs, resolveStandardCombat } from '@engine/rules/combat';
import { applyCombatResults } from '@engine/rules/applyCombat';
import { playDiceRoll, playFlakBurst, playCombatEngage, playExplosion } from '../../audio';
import { executeBotMovementPhase, applyBotMovement } from '@ai/BotController';

const s: Record<string, React.CSSProperties> = {
  panel: {
    backgroundColor: '#1a1a2e',
    borderRadius: 4,
    border: '1px solid #0f3460',
    marginTop: 8,
    padding: 12,
  },
  title: {
    color: '#e94560',
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
  highlight: {
    color: '#ffcc44',
    fontWeight: 'bold',
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
    backgroundColor: '#e94560',
    color: '#fff',
    border: '1px solid #e94560',
    fontWeight: 'bold',
  },
  btnSmall: {
    display: 'inline-block',
    width: 'auto',
    padding: '4px 10px',
    marginRight: 6,
    marginTop: 4,
    fontSize: 11,
  },
  result: {
    backgroundColor: '#0a1628',
    border: '1px solid #1a4a80',
    borderRadius: 4,
    padding: '8px 10px',
    marginTop: 6,
    fontSize: 12,
    color: '#aaa',
  },
  log: {
    maxHeight: 120,
    overflowY: 'auto' as const,
    fontSize: 10,
    color: '#888',
    lineHeight: 1.5,
    marginTop: 6,
    fontFamily: 'monospace',
  },
  flightBtn: {
    display: 'block',
    width: '100%',
    padding: '6px 10px',
    marginTop: 4,
    backgroundColor: '#16213e',
    color: '#ddd',
    border: '1px solid #0f3460',
    borderRadius: 4,
    fontSize: 11,
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
  mpBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  mpLabel: {
    color: '#e94560',
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: 'monospace',
  },
};

const MovementPanel: React.FC = () => {
  const { gameState, updateGameState } = useGameStore();
  const mvmt = useMovementStore();
  const { selectFlight } = useUIStore();

  const activeFlight = mvmt.activeFlightId
    ? gameState.flights[mvmt.activeFlightId]
    : null;

  // ── Step: Roll Initiative ──
  const handleRollInitiative = useCallback(() => {
    playDiceRoll();
    const result = rollInitiative();
    mvmt.setInitiativeResult(result.winner, result.roll);
    mvmt.addMovementLog(
      `Initiative: Roll ${result.roll} → ${result.winner.toUpperCase()} wins`
    );

    // Determine first drawer
    const firstDrawer = getNextChitDrawSide(gameState, null, result.winner);
    if (firstDrawer) {
      mvmt.setStep('chitDraw');
      mvmt.setChitResult(firstDrawer, 0, 0);
    } else {
      mvmt.setStep('phaseComplete');
    }
  }, [gameState, mvmt]);

  // ── Step: Draw Chit ──
  const handleDrawChit = useCallback(() => {
    const side = mvmt.currentDrawSide!;
    const result = executeChitDraw(gameState, side);
    mvmt.setChitResult(side, result.value, result.flightsToMove);
    mvmt.addMovementLog(
      `${side.toUpperCase()} draws chit: ${result.value} (${result.isLargeForce ? 'Large' : 'Small'} Force) → move ${result.flightsToMove} flight(s)`
    );

    if (result.flightsToMove > 0) {
      if (side === gameState.humanSide) {
        mvmt.setStep('selectFlight');
      } else {
        // Bot side: use AI to move flights
        mvmt.addMovementLog(`  Bot ${side.toUpperCase()} AI moving flights...`);
        const botResult = executeBotMovementPhase(gameState, side);
        for (const logMsg of botResult.log) {
          mvmt.addMovementLog(`  ${logMsg}`);
        }
        updateGameState((state) => applyBotMovement(state, botResult));
        // Advance to next chit draw
        advanceToNextChitDraw();
      }
    } else {
      mvmt.addMovementLog(`  No flights to move`);
      advanceToNextChitDraw();
    }
  }, [gameState, mvmt, updateGameState]);

  // ── Advance to next chit draw or end phase ──
  const advanceToNextChitDraw = useCallback(() => {
    const nextSide = getNextChitDrawSide(
      gameState,
      mvmt.currentDrawSide,
      mvmt.initiativeWinner!
    );
    if (nextSide) {
      mvmt.setChitResult(nextSide, 0, 0);
      mvmt.setStep('chitDraw');
    } else {
      mvmt.setStep('phaseComplete');
    }
  }, [gameState, mvmt]);

  // ── Step: Select Flight ──
  const movableFlights = useMemo(() => {
    if (mvmt.step !== 'selectFlight') return [];
    return getMovableFlights(gameState, gameState.humanSide);
  }, [gameState, mvmt.step]);

  const handleSelectFlight = useCallback((flightId: string) => {
    mvmt.setActiveFlight(flightId);
    selectFlight(flightId);
    mvmt.setStep('setSpeed');
  }, [mvmt, selectFlight]);

  // ── Step: Set Speed ──
  const handleSetSpeed = useCallback((throttle: Throttle, speed: number) => {
    if (!mvmt.activeFlightId) return;

    updateGameState((state) => {
      const flight = state.flights[mvmt.activeFlightId!];
      const updated = initializeMovement(flight, throttle, speed);
      return {
        ...state,
        flights: { ...state.flights, [mvmt.activeFlightId!]: updated },
      };
    });

    mvmt.addMovementLog(
      `${mvmt.activeFlightId} sets ${throttle} throttle, speed ${speed}`
    );
    mvmt.setStep('moving');

    // Calculate valid moves
    setTimeout(() => updateValidMoves(), 50);
  }, [mvmt, updateGameState]);

  // ── Auto-recalculate valid moves when flight state changes ──
  useEffect(() => {
    if (mvmt.step !== 'moving' || !mvmt.activeFlightId) return;
    const flight = gameState.flights[mvmt.activeFlightId];
    if (!flight || flight.mpRemaining <= 0) {
      mvmt.setValidMoveHexes([]);
      return;
    }
    const actions = getValidActions(flight, gameState, gameState.timeOfDay === 'night');
    const moveHexes: ValidMoveHex[] = [];
    for (const action of actions) {
      if (action.type === 'move') {
        const targetHex = getNeighbor(flight.hex, action.direction);
        moveHexes.push({ hex: targetHex, direction: action.direction, actionType: 'move' });
      }
    }
    mvmt.setValidMoveHexes(moveHexes);
  }, [mvmt.step, mvmt.activeFlightId, gameState.flights]);

  // ── Calculate valid moves for active flight ──
  const updateValidMoves = useCallback(() => {
    if (!mvmt.activeFlightId) return;
    const flight = gameState.flights[mvmt.activeFlightId];
    if (!flight) return;

    const actions = getValidActions(flight, gameState, gameState.timeOfDay === 'night');
    const moveHexes: ValidMoveHex[] = [];

    for (const action of actions) {
      if (action.type === 'move') {
        const targetHex = getNeighbor(flight.hex, action.direction);
        moveHexes.push({ hex: targetHex, direction: action.direction, actionType: 'move' });
      }
    }

    mvmt.setValidMoveHexes(moveHexes);
  }, [gameState, mvmt]);

  // ── Step: Moving — handle hex click ──
  // Undo last movement step
  const handleMovementUndo = useCallback(() => {
    const snapshot = mvmt.popUndoSnapshot();
    if (snapshot) {
      const restored = JSON.parse(snapshot);
      updateGameState(() => restored);
      mvmt.addMovementLog('  ↩ Move undone');
    }
  }, [mvmt, updateGameState]);

  const handleMoveToHex = useCallback((direction: number) => {
    if (!mvmt.activeFlightId) return;

    // Save snapshot before move for undo
    mvmt.pushUndoSnapshot(JSON.stringify(gameState));

    updateGameState((state) => {
      const flight = state.flights[mvmt.activeFlightId!];
      const targetHex = getNeighbor(flight.hex, direction as any);
      let updated = {
        ...flight,
        hex: targetHex,
        mpRemaining: flight.mpRemaining - 1,
        hasMoved: true,
        hasMovedThisPhase: true,
      };

      mvmt.addMovementLog(`  → ${hexToId(targetHex)} (${updated.mpRemaining} MP left)`);

      let newState = { ...state, flights: { ...state.flights, [mvmt.activeFlightId!]: updated } };

      // ── AAA fire during movement ──
      // Check barrage zones
      const aaaUnits = isInBarrageZone(targetHex, newState);
      for (const aaa of aaaUnits) {
        if (aaa.side === flight.side) continue; // Friendly AAA deconfliction
        const result = resolveAAABarrage(aaa, updated, newState);
        if (result.hitNumber > 0) {
          playFlakBurst();
          mvmt.addMovementLog(`  [AAA] ${aaa.subType} barrage: roll ${result.roll}/${result.hitNumber} → ${result.hit ? 'HIT' : 'miss'}`);
          if (result.hit && result.damageResult && result.damageResult !== 'none') {
            playExplosion();
            const dmg = allocateDamage(updated, result.damageResult);
            mvmt.addMovementLog(`    DMG: AC#${dmg.aircraftIndex} → ${dmg.resultingDamage.toUpperCase()}`);
            const newAc = updated.aircraft.map(a => a.index === dmg.aircraftIndex ? { ...a, damage: dmg.resultingDamage } : a);
            updated = { ...updated, aircraft: newAc };
            newState = { ...newState, flights: { ...newState.flights, [mvmt.activeFlightId!]: updated } };
          }
        }
      }

      // Check Fire Can (Radar AAA) within 2 hexes
      for (const u of Object.values(newState.groundUnits)) {
        if (u.side === flight.side || u.type !== 'radarAAA' || !u.radarOn) continue;
        if (hexDistance(u.hex, targetHex) <= 2) {
          const result = resolveFireCanAttack(u, updated, newState);
          if (result.hitNumber > 0) {
            mvmt.addMovementLog(`  [AAA] Fire Can: roll ${result.roll}/${result.hitNumber} → ${result.hit ? 'HIT' : 'miss'}`);
            if (result.hit && result.damageResult && result.damageResult !== 'none') {
              const dmg = allocateDamage(updated, result.damageResult);
              mvmt.addMovementLog(`    DMG: AC#${dmg.aircraftIndex} → ${dmg.resultingDamage.toUpperCase()}`);
              const newAc = updated.aircraft.map(a => a.index === dmg.aircraftIndex ? { ...a, damage: dmg.resultingDamage } : a);
              updated = { ...updated, aircraft: newAc };
              newState = { ...newState, flights: { ...newState.flights, [mvmt.activeFlightId!]: updated } };
            }
          }
        }
      }

      // Check Mobile AAA within 1 hex
      for (const u of Object.values(newState.groundUnits)) {
        if (u.side === flight.side) continue;
        const isMobile = u.type === 'mobileAAA' || u.organicMobileAAA;
        const radarOn = u.type === 'mobileAAA' ? u.radarOn : u.organicMobileRadarOn;
        if (!isMobile || !radarOn) continue;
        if (hexDistance(u.hex, targetHex) <= 1) {
          const result = resolveMobileAAAAttack(u, updated, newState);
          if (result.hitNumber > 0) {
            mvmt.addMovementLog(`  [AAA] Mobile AAA: roll ${result.roll}/${result.hitNumber} → ${result.hit ? 'HIT' : 'miss'}`);
            if (result.hit && result.damageResult && result.damageResult !== 'none') {
              const dmg = allocateDamage(updated, result.damageResult);
              mvmt.addMovementLog(`    DMG: AC#${dmg.aircraftIndex} → ${dmg.resultingDamage.toUpperCase()}`);
              const newAc = updated.aircraft.map(a => a.index === dmg.aircraftIndex ? { ...a, damage: dmg.resultingDamage } : a);
              updated = { ...updated, aircraft: newAc };
              newState = { ...newState, flights: { ...newState.flights, [mvmt.activeFlightId!]: updated } };
            }
          }
        }
      }

      // ── Combat engagement check during movement ──
      if (!updated.disordered && !updated.aborted && updated.aircraft.some(a => a.damage !== 'shotdown' && a.airToAirWeapons.some(w => !w.depleted))) {
        const enemySide: Side = flight.side === 'nato' ? 'wp' : 'nato';
        for (const enemy of Object.values(newState.flights)) {
          if (enemy.side !== enemySide || !enemy.detected) continue;
          if (enemy.aircraft.every(a => a.damage === 'shotdown')) continue;
          if (hexDistance(updated.hex, enemy.hex) > 1) continue;

          // Log engagement opportunity
          playCombatEngage();
          mvmt.addMovementLog(`  ⚠ Enemy ${enemy.id} (${enemy.aircraftType}) in range — engage via End Movement`);
          break;
        }
      }

      return newState;
    });
  }, [mvmt, updateGameState]);

  // ── Handle turn/climb/dive ──
  const handleTurn = useCallback((degrees: number) => {
    if (!mvmt.activeFlightId) return;

    updateGameState((state) => {
      const flight = state.flights[mvmt.activeFlightId!];
      const newHeading = ((flight.heading + degrees) % 360 + 360) % 360;
      const updated = {
        ...flight,
        heading: newHeading,
        mpRemaining: flight.mpRemaining - 1,
      };
      mvmt.addMovementLog(`  Turn ${degrees > 0 ? '+' : ''}${degrees}° → hdg ${newHeading}° (${updated.mpRemaining} MP)`);
      return { ...state, flights: { ...state.flights, [mvmt.activeFlightId!]: updated } };
    });
  }, [mvmt, updateGameState]);

  const handleClimb = useCallback(() => {
    if (!mvmt.activeFlightId) return;
    const altOrder = ['deck', 'low', 'medium', 'high', 'veryHigh'] as const;

    updateGameState((state) => {
      const flight = state.flights[mvmt.activeFlightId!];
      const idx = altOrder.indexOf(flight.altitude);
      if (idx >= 4) return state;
      const newAlt = altOrder[idx + 1];
      const updated = { ...flight, altitude: newAlt, mpRemaining: flight.mpRemaining - 1, hasMoved: true };
      mvmt.addMovementLog(`  Climb → ${newAlt.toUpperCase()} (${updated.mpRemaining} MP)`);
      return { ...state, flights: { ...state.flights, [mvmt.activeFlightId!]: updated } };
    });
  }, [mvmt, updateGameState]);

  const handleDive = useCallback((toAlt: string) => {
    if (!mvmt.activeFlightId) return;

    updateGameState((state) => {
      const flight = state.flights[mvmt.activeFlightId!];
      const updated = { ...flight, altitude: toAlt as any, mpRemaining: flight.mpRemaining - 1, hasMoved: true };
      mvmt.addMovementLog(`  Dive → ${toAlt.toUpperCase()} (${updated.mpRemaining} MP)`);
      return { ...state, flights: { ...state.flights, [mvmt.activeFlightId!]: updated } };
    });
  }, [mvmt, updateGameState]);

  // ── End flight movement ──
  const handleEndFlightMovement = useCallback(() => {
    if (!mvmt.activeFlightId) return;

    // Mark flight as moved
    updateGameState((state) => {
      const flight = state.flights[mvmt.activeFlightId!];
      return {
        ...state,
        flights: {
          ...state.flights,
          [mvmt.activeFlightId!]: { ...flight, hasMovedThisPhase: true, mpRemaining: 0 },
        },
      };
    });

    mvmt.flightMoved();
    mvmt.setActiveFlight(null);
    mvmt.setValidMoveHexes([]);
    selectFlight(null);

    // Check if we need more flights for this chit
    const moved = mvmt.flightsMovedThisChit + 1;
    if (moved < mvmt.flightsToMoveThisChit) {
      mvmt.setStep('selectFlight');
    } else {
      // This chit is done, advance to next
      advanceToNextChitDraw();
    }
  }, [mvmt, updateGameState, selectFlight, advanceToNextChitDraw]);

  // ── Render ──
  return (
    <div style={s.panel}>
      <div style={s.title}>Movement Phase</div>

      {/* Step: Roll Initiative */}
      {mvmt.step === 'rollInitiative' && (
        <>
          <div style={s.text}>
            Roll to determine initiative. The winner chooses who draws the first chit.
          </div>
          <button style={{ ...s.btn, ...s.btnPrimary }} onClick={handleRollInitiative}>
            Roll Initiative (d10)
          </button>
        </>
      )}

      {/* Show initiative result */}
      {mvmt.initiativeWinner && (
        <div style={s.result}>
          Initiative: <span style={s.highlight}>{mvmt.initiativeWinner.toUpperCase()}</span> wins
          (roll: {mvmt.initiativeRoll})
        </div>
      )}

      {/* Step: Chit Draw */}
      {mvmt.step === 'chitDraw' && (
        <>
          <div style={s.text}>
            <span style={s.highlight}>{mvmt.currentDrawSide?.toUpperCase()}</span> draws a chit
            to determine how many flights move.
          </div>
          <button style={{ ...s.btn, ...s.btnPrimary }} onClick={handleDrawChit}>
            Draw Chit ({mvmt.currentDrawSide?.toUpperCase()})
          </button>
        </>
      )}

      {/* Show chit result */}
      {mvmt.chitValue !== null && mvmt.chitValue > 0 && mvmt.step !== 'chitDraw' && (
        <div style={s.result}>
          Chit: {mvmt.chitValue} → Move {mvmt.flightsToMoveThisChit} flight(s)
          ({mvmt.flightsMovedThisChit}/{mvmt.flightsToMoveThisChit} moved)
        </div>
      )}

      {/* Step: Select Flight */}
      {mvmt.step === 'selectFlight' && (
        <>
          <div style={s.text}>
            Select a flight to move ({mvmt.flightsMovedThisChit}/{mvmt.flightsToMoveThisChit}):
          </div>
          {movableFlights.map((fid) => {
            const f = gameState.flights[fid];
            return (
              <button
                key={fid}
                style={s.flightBtn}
                onClick={() => handleSelectFlight(fid)}
              >
                <strong>{fid}</strong> — {f.aircraftType} @ {f.altitude.toUpperCase()}
                {' '}({hexToId(f.hex)})
              </button>
            );
          })}
        </>
      )}

      {/* Step: Set Speed */}
      {mvmt.step === 'setSpeed' && activeFlight && (() => {
        const aircraft = getAircraftData(activeFlight.aircraftType);
        if (!aircraft) return null;
        const combatRange = getSpeedRange(activeFlight, 'combat');
        const dashRange = getSpeedRange(activeFlight, 'dash');

        return (
          <>
            <div style={s.text}>
              Set throttle and speed for <span style={s.highlight}>{activeFlight.id}</span>:
            </div>

            {combatRange && (
              <div style={{ marginBottom: 6 }}>
                <div style={{ color: '#888', fontSize: 10, marginBottom: 2 }}>COMBAT THROTTLE</div>
                {Array.from(
                  { length: combatRange.max - combatRange.min + 1 },
                  (_, i) => combatRange.min + i
                ).map((spd) => (
                  <button
                    key={`combat-${spd}`}
                    style={{ ...s.btn, ...s.btnSmall }}
                    onClick={() => handleSetSpeed('combat', spd)}
                  >
                    Speed {spd}
                  </button>
                ))}
              </div>
            )}

            {dashRange && (
              <div>
                <div style={{ color: '#888', fontSize: 10, marginBottom: 2 }}>DASH THROTTLE</div>
                {Array.from(
                  { length: dashRange.max - dashRange.min + 1 },
                  (_, i) => dashRange.min + i
                ).map((spd) => (
                  <button
                    key={`dash-${spd}`}
                    style={{ ...s.btn, ...s.btnSmall }}
                    onClick={() => handleSetSpeed('dash', spd)}
                  >
                    Speed {spd}
                  </button>
                ))}
              </div>
            )}
          </>
        );
      })()}

      {/* Step: Moving */}
      {mvmt.step === 'moving' && activeFlight && (
        <>
          <div style={s.mpBar}>
            <span style={{ color: '#888', fontSize: 11 }}>MP Remaining:</span>
            <span style={s.mpLabel}>{activeFlight.mpRemaining}/{activeFlight.speed}</span>
          </div>

          <div style={{ color: '#888', fontSize: 10, marginBottom: 6 }}>
            Click a highlighted hex to move, or use controls below:
          </div>

          {/* Move buttons for valid directions */}
          {mvmt.validMoveHexes.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ color: '#888', fontSize: 10, marginBottom: 2 }}>MOVE</div>
              {mvmt.validMoveHexes.map((vh, i) => (
                <button
                  key={i}
                  style={{ ...s.btn, ...s.btnSmall }}
                  onClick={() => handleMoveToHex(vh.direction)}
                >
                  → {hexToId(vh.hex)}
                </button>
              ))}
            </div>
          )}

          {/* Turn controls */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ color: '#888', fontSize: 10, marginBottom: 2 }}>TURN (costs 1 MP)</div>
            {activeFlight.mpRemaining > 0 && (
              <>
                <button style={{ ...s.btn, ...s.btnSmall }} onClick={() => handleTurn(-60)}>↰ -60°</button>
                <button style={{ ...s.btn, ...s.btnSmall }} onClick={() => handleTurn(-30)}>↰ -30°</button>
                <button style={{ ...s.btn, ...s.btnSmall }} onClick={() => handleTurn(30)}>↱ +30°</button>
                <button style={{ ...s.btn, ...s.btnSmall }} onClick={() => handleTurn(60)}>↱ +60°</button>
              </>
            )}
          </div>

          {/* Altitude controls */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ color: '#888', fontSize: 10, marginBottom: 2 }}>ALTITUDE (costs 1 MP)</div>
            {activeFlight.mpRemaining > 0 && (
              <>
                {activeFlight.altitude !== 'veryHigh' && (
                  <button style={{ ...s.btn, ...s.btnSmall }} onClick={handleClimb}>↑ Climb</button>
                )}
                {activeFlight.altitude !== 'deck' && (
                  <>
                    {['deck', 'low', 'medium', 'high'].filter(
                      (a) => ['deck', 'low', 'medium', 'high', 'veryHigh'].indexOf(a) <
                        ['deck', 'low', 'medium', 'high', 'veryHigh'].indexOf(activeFlight.altitude)
                    ).map((a) => (
                      <button key={a} style={{ ...s.btn, ...s.btnSmall }} onClick={() => handleDive(a)}>
                        ↓ {a.toUpperCase()}
                      </button>
                    ))}
                  </>
                )}
              </>
            )}
          </div>

          {/* Undo / End movement */}
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button
              style={{ ...s.btn, flex: 1, opacity: mvmt.movementUndoStack.length > 0 ? 1 : 0.4 }}
              onClick={handleMovementUndo}
              disabled={mvmt.movementUndoStack.length === 0}
            >
              ↩ Undo Move
            </button>
            <button
              style={{ ...s.btn, ...s.btnPrimary, flex: 2 }}
              onClick={handleEndFlightMovement}
            >
              {activeFlight.mpRemaining <= 0 ? 'Flight Done' : `End Movement (${activeFlight.mpRemaining} MP unused)`}
            </button>
          </div>
        </>
      )}

      {/* Step: Phase Complete */}
      {mvmt.step === 'phaseComplete' && (
        <div style={s.result}>
          All flights have moved. Advance to the next phase.
        </div>
      )}

      {/* Movement log */}
      {mvmt.movementLog.length > 0 && (
        <div style={s.log}>
          {mvmt.movementLog.map((msg, i) => (
            <div key={i}>{msg}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MovementPanel;
