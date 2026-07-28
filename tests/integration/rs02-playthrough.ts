/**
 * RS2: Operation Boloski — Full NATO playthrough.
 * Mass WP fighter sweep vs NATO CAP and QRA.
 */

import { loadScenario } from '../../src/engine/scenarioLoader';
import { advancePhase } from '../../src/engine/controller/PhaseStateMachine';
import { rollInitiative, executeChitDraw, getMovableFlights, getNextChitDrawSide } from '../../src/engine/rules/initiative';
import { initializeMovement } from '../../src/engine/rules/movement';
import { runDetectionPhase, applyDetectionResults, applyTrackPhase } from '../../src/engine/rules/detection';
import { rollRandomEvent } from '../../src/engine/rules/randomEvents';
import { runSAMAcquisitionPhase, applyAcquisitionResults } from '../../src/engine/rules/sam';
import { executeBotMovementPhase, applyBotMovement, executeBotSAMAttacks } from '../../src/ai/BotController';
import { resolveStandardCombat, checkStandardEngagementPrereqs } from '../../src/engine/rules/combat';
import { applyCombatResults } from '../../src/engine/rules/applyCombat';
import { calculateVP, determineVictoryLevel } from '../../src/engine/rules/victory';
import { shouldMarkFuel } from '../../src/engine/rules/fuel';
import { GameState, FlightState, hexToId, Side } from '../../src/engine/state/GameState';
import { hexDistance, getNeighbor, hexBearing, normalizeHeading } from '../../src/engine/hex';
import { getAircraftData, getSpeed } from '../../src/data/aircraft/aircraftDatabase';

function log(m: string) { console.log(m); }
function section(t: string) { log(`\n${'═'.repeat(60)}\n  ${t}\n${'═'.repeat(60)}`); }

function moveToward(state: GameState, fid: string, target: {col:number,row:number}, throttle: 'combat'|'dash'): GameState {
  const f = state.flights[fid];
  if (!f || f.isOnGround) return state;
  const ac = getAircraftData(f.aircraftType);
  if (!ac) return state;
  const laden = f.aircraft.some(a => a.bombStrengthRemaining > 0);
  const hasCrippled = f.aircraft.some(a => a.damage === 'crippled');
  if (hasCrippled && throttle === 'dash') throttle = 'combat';
  const speed = Math.max(1, getSpeed(ac, f.altitude, throttle, laden) ?? 4);
  let u = initializeMovement(f, throttle, speed);

  for (let i = 0; i < speed; i++) {
    let bestDir: 0|1|2|3|4|5 = 0;
    let bestDist = Infinity;
    for (let d = 0; d < 6; d++) {
      const n = getNeighbor(u.hex, d as 0|1|2|3|4|5);
      const dist = hexDistance(n, target);
      if (dist < bestDist && n.col >= 0 && n.col <= 79 && n.row >= 0 && n.row <= 50) {
        bestDist = dist; bestDir = d as 0|1|2|3|4|5;
      }
    }
    const next = getNeighbor(u.hex, bestDir);
    const dirHdg: Record<number,number> = {0:0,1:300,2:240,3:180,4:120,5:60};
    u = { ...u, hex: next, heading: dirHdg[bestDir] ?? 0, mpRemaining: u.mpRemaining - 1 };
  }
  return { ...state, flights: { ...state.flights, [fid]: { ...u, hasMovedThisPhase: true, hasMoved: true, mpRemaining: 0 } } };
}

function flightStatus(f: FlightState): string {
  const alive = f.aircraft.filter(a => a.damage !== 'shotdown').length;
  const dmg = f.aircraft.filter(a => a.damage === 'damaged').length;
  const crip = f.aircraft.filter(a => a.damage === 'crippled').length;
  let s = `${alive}/${f.aircraft.length}ac`;
  if (dmg) s += ` ${dmg}D`;
  if (crip) s += ` ${crip}C`;
  if (f.disordered) s += ' DIS';
  if (f.aborted) s += ' ABT';
  if (f.detected) s += ' DET';
  return s;
}

function playRS2() {
  section('RS2: OPERATION BOLOSKI — FULL PLAYTHROUGH');
  let state = loadScenario('rs02');

  log(`\nScenario: ${state.scenarioName}`);
  log(`Human: NATO | Bot: WP | Turns: ${state.maxTurns}`);
  log(`Detection: NATO ${state.natoDetectionLevel} / WP ${state.wpDetectionLevel}`);

  log(`\nNATO Flights:`);
  for (const f of Object.values(state.flights).filter(f => f.side === 'nato'))
    log(`  ${f.id}: ${f.aircraft.length}x ${f.aircraftType} [${f.task}] @ ${hexToId(f.hex)} ${f.altitude}${f.isOnGround ? ' (GROUND)' : ''}`);

  log(`\nWP Flights (AI):`);
  for (const f of Object.values(state.flights).filter(f => f.side === 'wp'))
    log(`  ${f.id}: ${f.aircraft.length}x ${f.aircraftType} [${f.task}] @ ${hexToId(f.hex)} ${f.altitude}`);

  log(`\nGround Units:`);
  for (const u of Object.values(state.groundUnits))
    log(`  ${u.id} (${u.side}): ${u.subType} @ ${hexToId(u.hex)} radar=${u.radarOn ? 'ON' : 'OFF'}`);

  state = advancePhase(state); // Setup -> Jamming T1
  let totalCombats = 0;
  let natoKills = 0;
  let wpKills = 0;

  for (let turn = 1; turn <= (state.maxTurns ?? 15); turn++) {
    section(`TURN ${turn}`);
    let phases = 0;

    while (state.phase !== 'completed' && phases < 12) {
      phases++;
      const phase = state.phase;

      switch (phase) {
        case 'randomEvent': {
          const ev = rollRandomEvent(turn);
          log(`[Random] Roll ${ev.roll}: ${ev.event ? ev.event.name : 'No event'}`);
          if (ev.event) state = ev.event.effect(state);
          break;
        }
        case 'jamming': break;

        case 'detection': {
          const res = runDetectionPhase(state);
          state = applyDetectionResults(state, res);
          const det = res.filter(r => r.detected);
          for (const r of res) log(`[Det] ${r.targetId}: ${r.method} ${r.roll}/${r.needed} → ${r.detected ? 'DETECTED' : 'miss'}`);
          break;
        }

        case 'movement': {
          const init = rollInitiative();
          log(`[Init] Roll ${init.roll} → ${init.winner.toUpperCase()}`);
          let drawSide: Side | null = init.winner;
          let round = 0;

          while (drawSide && round < 20) {
            round++;
            const chit = executeChitDraw(state, drawSide);

            if (drawSide === 'nato') {
              let moved = 0;
              while (moved < chit.flightsToMove) {
                const movable = getMovableFlights(state, 'nato');
                if (movable.length === 0) break;
                const fid = movable[0];
                moved++;
                const f = state.flights[fid];
                if (f.isOnGround || f.aborted) continue;
                if (f.disordered) {
                  // Disordered: try to fly west to safety
                  state = moveToward(state, fid, { col: 30, row: f.hex.row }, 'combat');
                  log(`  ${fid} (DIS) retreats → ${hexToId(state.flights[fid].hex)}`);
                  continue;
                }

                // NATO CAP strategy: intercept nearest detected WP flight
                const wpDetected = Object.values(state.flights)
                  .filter(w => w.side === 'wp' && w.detected && !w.isOnGround && w.aircraft.some(a => a.damage !== 'shotdown'))
                  .sort((a, b) => hexDistance(f.hex, a.hex) - hexDistance(f.hex, b.hex));

                let target: {col:number,row:number};
                let thr: 'combat' | 'dash' = 'dash';

                if (wpDetected.length > 0) {
                  target = wpDetected[0].hex;
                  thr = hexDistance(f.hex, target) > 5 ? 'dash' : 'combat';
                  // Match altitude to engage (must be at or above defender)
                  const altOrder = ['deck','low','medium','high','veryHigh'] as const;
                  const myAltIdx = altOrder.indexOf(f.altitude);
                  const tgtAltIdx = altOrder.indexOf(wpDetected[0].altitude);
                  if (myAltIdx < tgtAltIdx && tgtAltIdx <= 3) {
                    // Climb to match
                    const newFlight = { ...state.flights[fid], altitude: altOrder[tgtAltIdx] };
                    state = { ...state, flights: { ...state.flights, [fid]: newFlight } };
                    log(`  ${fid} climbs to ${altOrder[tgtAltIdx].toUpperCase()}`);
                  }
                } else {
                  // No detected WP: patrol at orbit point or advance east
                  target = { col: Math.min(f.hex.col + 8, 55), row: f.hex.row };
                  thr = 'combat';
                }

                state = moveToward(state, fid, target, thr);
                const movedFlight = state.flights[fid];
                log(`  ${fid} → ${hexToId(movedFlight.hex)} ${movedFlight.altitude} ${thr} (${f.aircraftType})`);
              }
            } else {
              // WP AI
              if (chit.flightsToMove > 0) {
                const botRes = executeBotMovementPhase(state, 'wp');
                state = applyBotMovement(state, botRes);
                for (const m of botRes.log) log(`  [AI] ${m}`);
              }
            }
            drawSide = getNextChitDrawSide(state, drawSide, init.winner);
          }

          // SAM attacks
          const { state: s1, log: l1 } = executeBotSAMAttacks(state, 'wp');
          state = s1; for (const l of l1) log(`  [SAM] ${l}`);
          const { state: s2, log: l2 } = executeBotSAMAttacks(state, 'nato');
          state = s2; for (const l of l2) log(`  [SAM] ${l}`);

          // Air combat — check all possible engagements
          const natoCAP = Object.values(state.flights).filter(
            f => f.side === 'nato' && !f.disordered && !f.aborted && f.hasMoved &&
            f.aircraft.some(a => a.damage !== 'shotdown' && a.airToAirWeapons.some(w => !w.depleted))
          );
          const wpFlights = Object.values(state.flights).filter(
            f => f.side === 'wp' && f.detected && !f.isOnGround &&
            f.aircraft.some(a => a.damage !== 'shotdown')
          );

          for (const nf of natoCAP) {
            // Re-read from state in case nf was updated by prior combat
            const currentNF = state.flights[nf.id];
            if (!currentNF || currentNF.disordered || currentNF.aborted) continue;
            if (currentNF.aircraft.every(a => a.damage === 'shotdown')) continue;

            for (const wf of wpFlights) {
              const currentWF = state.flights[wf.id];
              if (!currentWF || currentWF.aircraft.every(a => a.damage === 'shotdown')) continue;

              const dist = hexDistance(currentNF.hex, currentWF.hex);
              if (dist > 1) continue;

              const check = checkStandardEngagementPrereqs(currentNF, currentWF, state);
              if (!check.canEngage) continue;

              log(`\n  *** COMBAT: ${nf.id} (${nf.aircraftType}) vs ${wf.id} (${wf.aircraftType}) ***`);
              const combat = resolveStandardCombat(currentNF, currentWF, true);
              totalCombats++;
              log(`    Engagement: ${combat.engagement.outcome}${combat.engagement.attackerHasSurprise ? ' SURPRISE!' : ''}`);

              if (combat.engagement.combatOccurs) {
                const atkShots = combat.attackerManeuver?.shotOpportunities ?? 0;
                const defShots = combat.defenderManeuver?.shotOpportunities ?? 0;
                log(`    Maneuver: ${nf.id}=${atkShots} shots, ${wf.id}=${defShots} shots`);

                for (const s of combat.attackerShots)
                  log(`    ${nf.id} fires ${s.weaponId}: ${s.finalRoll} → ${s.hit ? s.damageType!.toUpperCase() : 'MISS'}`);
                for (const s of combat.defenderShots)
                  log(`    ${wf.id} fires ${s.weaponId}: ${s.finalRoll} → ${s.hit ? s.damageType!.toUpperCase() : 'MISS'}`);

                log(`    Morale: ${nf.id}=${combat.attackerMorale?.result} ${wf.id}=${combat.defenderMorale?.result}`);

                // PERSIST to game state
                state = applyCombatResults(state, nf.id, wf.id, combat);

                const aN = state.flights[nf.id];
                const aW = state.flights[wf.id];
                log(`    Result: ${nf.id}=[${flightStatus(aN)}] ${wf.id}=[${flightStatus(aW)}]`);

                // Count kills
                const natoLost = nf.aircraft.filter(a => a.damage !== 'shotdown').length -
                  aN.aircraft.filter(a => a.damage !== 'shotdown').length;
                const wpLost = wf.aircraft.filter(a => a.damage !== 'shotdown').length -
                  aW.aircraft.filter(a => a.damage !== 'shotdown').length;
                wpKills += natoLost;
                natoKills += wpLost;
              }
              break; // One combat per NATO flight per phase
            }
          }
          break;
        }

        case 'fuel': {
          let n = 0;
          for (const [id, f] of Object.entries(state.flights)) {
            const pts = shouldMarkFuel(f, f.throttle === 'dash', false);
            if (pts > 0) { state = { ...state, flights: { ...state.flights, [id]: { ...f, fuelUsed: f.fuelUsed + pts } } }; n++; }
          }
          log(`[Fuel] ${n} flight(s)`);
          break;
        }
        case 'samLocation': break;
        case 'track': {
          const { state: s2, autoUndetected } = applyTrackPhase(state);
          state = s2;
          if (autoUndetected.length > 0) log(`[Track] Undetected: ${autoUndetected.join(', ')}`);
          break;
        }
        case 'samAcquisition': {
          const all = [...runSAMAcquisitionPhase(state, 'nato'), ...runSAMAcquisitionPhase(state, 'wp')];
          state = applyAcquisitionResults(state, all);
          for (const a of all) if (a.result !== 'none') log(`[SAM Acq] ${a.samId}→${a.targetId}: ${a.result.toUpperCase()}`);
          break;
        }
        case 'admin': {
          const flights: Record<string, FlightState> = {};
          for (const [id, f] of Object.entries(state.flights)) {
            flights[id] = { ...f, hasMoved: false, hasMovedThisPhase: false,
              markers: f.markers.filter(m => m !== 'zoomClimb' && m !== 'maxTurn' && m !== 'antiRadarTactics') };
          }
          state = { ...state, flights };
          break;
        }
      }

      state = advancePhase(state);
      if (state.turn > turn) break;
      if (state.phase === 'completed') break;
    }

    // End-of-turn summary
    log(`\n--- Turn ${turn} Summary ---`);
    for (const f of Object.values(state.flights)) {
      const alive = f.aircraft.filter(a => a.damage !== 'shotdown').length;
      if (alive < f.aircraft.length || f.detected || f.disordered || f.aborted)
        log(`  ${f.id}(${f.side} ${f.aircraftType}): ${flightStatus(f)} @ ${hexToId(f.hex)} ${f.altitude} fuel=${f.fuelUsed}/${f.fuelAllowance}`);
    }
    log(`  Running tally: NATO kills=${natoKills} WP kills=${wpKills}`);

    if (state.phase === 'completed') break;
  }

  // ── FINAL ──
  section('FINAL RESULTS');
  const natoVP = calculateVP(state, 'nato');
  const wpVP = calculateVP(state, 'wp');
  const victory = determineVictoryLevel(natoVP.total, wpVP.total, 'nato');

  log(`\nAll Flights:`);
  for (const f of Object.values(state.flights))
    log(`  ${f.id}(${f.side}): ${flightStatus(f)} @ ${hexToId(f.hex)} fuel=${f.fuelUsed}/${f.fuelAllowance}`);

  log(`\nNATO VP: ${natoVP.total} (kills:${natoVP.aircraftShotDown} dmg:${natoVP.aircraftDamaged} crew:${natoVP.crewCaptured})`);
  log(`WP VP:   ${wpVP.total} (kills:${wpVP.aircraftShotDown} dmg:${wpVP.aircraftDamaged} crew:${wpVP.crewCaptured})`);
  log(`Kill ratio: NATO ${natoKills} : WP ${wpKills}`);
  log(`\nVERDICT: ${victory.level.toUpperCase()} (margin ${victory.margin})`);
  log(`Combats: ${totalCombats}`);
}

playRS2();
