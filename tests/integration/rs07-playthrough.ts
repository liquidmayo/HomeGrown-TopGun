/**
 * RS07: Scenario 07 — Full NATO playthrough.
 * RS07 playthrough.
 */

import { loadScenario } from '../../src/engine/scenarioLoader';
import { advancePhase } from '../../src/engine/controller/PhaseStateMachine';
import { rollInitiative, executeChitDraw, getMovableFlights, getNextChitDrawSide } from '../../src/engine/rules/initiative';
import { initializeMovement } from '../../src/engine/rules/movement';
import { runDetectionPhase, applyDetectionResults, applyTrackPhase } from '../../src/engine/rules/detection';
import { rollRandomEvent } from '../../src/engine/rules/randomEvents';
import { runSAMAcquisitionPhase, applyAcquisitionResults } from '../../src/engine/rules/sam';
import { executeBotMovementPhase, applyBotMovement, executeBotSAMAttacks, executeBotCombat, launchQRAFlights } from '../../src/ai/BotController';
import { resolveStandardCombat, checkStandardEngagementPrereqs } from '../../src/engine/rules/combat';
import { applyCombatResults } from '../../src/engine/rules/applyCombat';
import { calculateVP, determineVictoryLevel } from '../../src/engine/rules/victory';
import { shouldMarkFuel } from '../../src/engine/rules/fuel';
import { GameState, FlightState, hexToId, Side } from '../../src/engine/state/GameState';
import { hexDistance, getNeighbor } from '../../src/engine/hex';
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
    let bestDir: 0|1|2|3|4|5 = 0, bestDist = Infinity;
    for (let d = 0; d < 6; d++) {
      const n = getNeighbor(u.hex, d as any);
      const dist = hexDistance(n, target);
      if (dist < bestDist && n.col >= 0 && n.col <= 79 && n.row >= 0 && n.row <= 50) { bestDist = dist; bestDir = d as any; }
    }
    const next = getNeighbor(u.hex, bestDir);
    const h: Record<number,number> = {0:0,1:300,2:240,3:180,4:120,5:60};
    u = { ...u, hex: next, heading: h[bestDir] ?? 0, mpRemaining: u.mpRemaining - 1 };
  }
  return { ...state, flights: { ...state.flights, [fid]: { ...u, hasMovedThisPhase: true, hasMoved: true, mpRemaining: 0 } } };
}

function fs(f: FlightState): string {
  const alive = f.aircraft.filter(a => a.damage !== 'shotdown').length;
  const dmg = f.aircraft.filter(a => a.damage === 'damaged').length;
  const crip = f.aircraft.filter(a => a.damage === 'crippled').length;
  let s = `${alive}/${f.aircraft.length}`;
  if (dmg) s += ` ${dmg}D`;
  if (crip) s += ` ${crip}C`;
  if (f.disordered) s += ' DIS';
  if (f.aborted) s += ' ABT';
  return s;
}

function playRS07() {
  section('RS07: SCENARIO 07 — FULL PLAYTHROUGH');
  let state = loadScenario('rs07');

  log(`\n${state.scenarioName} | NATO vs WP(AI) | ${state.maxTurns} turns`);
  log(`Detection: NATO ${state.natoDetectionLevel} / WP ${state.wpDetectionLevel}\n`);

  log('NATO:');
  for (const f of Object.values(state.flights).filter(f => f.side === 'nato'))
    log(`  ${f.id}: ${f.aircraft.length}x ${f.aircraftType} [${f.task}] @ ${hexToId(f.hex)} ${f.altitude}${f.isOnGround?' GND':''}`);
  log('WP (AI):');
  for (const f of Object.values(state.flights).filter(f => f.side === 'wp'))
    log(`  ${f.id}: ${f.aircraft.length}x ${f.aircraftType} [${f.task}] @ ${hexToId(f.hex)} ${f.altitude}`);
  log('Ground:');
  for (const u of Object.values(state.groundUnits))
    log(`  ${u.id}(${u.side}): ${u.subType} @ ${hexToId(u.hex)} rdr=${u.radarOn?'ON':'off'}`);

  state = advancePhase(state);
  let combats = 0, natoKills = 0, wpKills = 0;

  for (let turn = 1; turn <= (state.maxTurns ?? 15); turn++) {
    log(`\n────── TURN ${turn} ──────`);
    let ph = 0;
    while (state.phase !== 'completed' && ph < 12) {
      ph++;
      switch (state.phase) {
        case 'randomEvent': {
          const ev = rollRandomEvent(turn);
          if (ev.event) log(`[RND] ${ev.event.name}`);
          if (ev.event) state = ev.event.effect(state);
          break;
        }
        case 'jamming': break;
        case 'detection': {
          const res = runDetectionPhase(state);
          state = applyDetectionResults(state, res);
          const det = res.filter(r => r.detected);
          if (det.length > 0) log(`[DET] ${det.map(r => r.targetId).join(', ')} detected (${res.length} attempts)`);
          break;
        }
        case 'movement': {
          // Launch QRA for both sides
          for (const side of ['nato', 'wp'] as Side[]) {
            const { state: qs, log: ql } = launchQRAFlights(state, side);
            state = qs;
            for (const l of ql) log(`[QRA] ${l}`);
          }

          const init = rollInitiative();
          log(`[INIT] ${init.winner.toUpperCase()} (${init.roll})`);
          let drawSide: Side|null = init.winner;
          let rd = 0;
          while (drawSide && rd < 20) {
            rd++;
            const chit = executeChitDraw(state, drawSide);
            if (drawSide === 'nato') {
              let moved = 0;
              while (moved < chit.flightsToMove) {
                const movable = getMovableFlights(state, 'nato');
                if (movable.length === 0) break;
                const fid = movable[0];
                moved++;
                const f = state.flights[fid];
                if (f.isOnGround || f.aborted) { state = { ...state, flights: { ...state.flights, [fid]: { ...f, hasMovedThisPhase: true } } }; continue; }
                if (f.aircraft.every(a => a.damage === 'shotdown')) { state = { ...state, flights: { ...state.flights, [fid]: { ...f, hasMovedThisPhase: true } } }; continue; }

                // NATO strategy: CAP intercepts nearest WP, QRA launches
                const wpDet = Object.values(state.flights)
                  .filter(w => w.side === 'wp' && w.detected && w.aircraft.some(a => a.damage !== 'shotdown'))
                  .sort((a,b) => hexDistance(f.hex, a.hex) - hexDistance(f.hex, b.hex));

                let tgt: {col:number,row:number};
                let thr: 'combat'|'dash' = 'dash';

                if (f.disordered) {
                  tgt = { col: 30, row: f.hex.row }; thr = 'combat';
                } else if (wpDet.length > 0) {
                  tgt = wpDet[0].hex;
                  thr = hexDistance(f.hex, tgt) > 5 ? 'dash' : 'combat';
                  // Climb to match altitude
                  const altOrd = ['deck','low','medium','high','veryHigh'] as const;
                  const myAlt = altOrd.indexOf(f.altitude);
                  const tgtAlt = altOrd.indexOf(wpDet[0].altitude);
                  if (myAlt < tgtAlt && tgtAlt <= 3) {
                    state = { ...state, flights: { ...state.flights, [fid]: { ...state.flights[fid], altitude: altOrd[tgtAlt] } } };
                  }
                } else {
                  // Advance toward the front to patrol
                  const frontCol = state.frontHexes.length > 0
                    ? state.frontHexes.reduce((s, h) => s + h.col, 0) / state.frontHexes.length
                    : 55;
                  tgt = { col: Math.min(Math.round(frontCol) - 5, 60), row: f.hex.row };
                  thr = 'dash';
                }

                state = moveToward(state, fid, tgt, thr);
                const mf = state.flights[fid];
                log(`  ${fid} → ${hexToId(mf.hex)} ${mf.altitude} ${thr}`);
              }
            } else {
              if (chit.flightsToMove > 0) {
                const bot = executeBotMovementPhase(state, 'wp');
                state = applyBotMovement(state, bot);
                for (const m of bot.log) log(`  [AI] ${m}`);
              }
            }
            drawSide = getNextChitDrawSide(state, drawSide, init.winner);
          }

          // SAM attacks
          for (const side of ['wp', 'nato'] as Side[]) {
            const { state: s, log: sl } = executeBotSAMAttacks(state, side);
            state = s;
            for (const l of sl) log(`  [SAM] ${l}`);
          }

          // Air combat
          for (const nf of Object.values(state.flights).filter(f => f.side === 'nato' && !f.disordered && !f.aborted && f.hasMoved && f.aircraft.some(a => a.damage !== 'shotdown' && a.airToAirWeapons.some(w => !w.depleted)))) {
            const cur = state.flights[nf.id];
            if (!cur || cur.disordered || cur.aborted || cur.aircraft.every(a => a.damage === 'shotdown')) continue;

            for (const wf of Object.values(state.flights).filter(f => f.side === 'wp' && f.detected && f.aircraft.some(a => a.damage !== 'shotdown'))) {
              const cw = state.flights[wf.id];
              if (!cw || cw.aircraft.every(a => a.damage === 'shotdown')) continue;
              if (hexDistance(cur.hex, cw.hex) > 1) continue;

              const check = checkStandardEngagementPrereqs(cur, cw, state);
              if (!check.canEngage) continue;

              const combat = resolveStandardCombat(cur, cw, true);
              combats++;
              log(`\n  *** ${nf.id}(${nf.aircraftType}) vs ${wf.id}(${wf.aircraftType}) — ${combat.engagement.outcome}${combat.engagement.attackerHasSurprise?' SURPRISE!':''} ***`);

              if (combat.engagement.combatOccurs) {
                for (const s of combat.attackerShots) log(`    ${nf.id} ${s.weaponId}: ${s.finalRoll}→${s.hit?s.damageType!.toUpperCase():'miss'}`);
                for (const s of combat.defenderShots) log(`    ${wf.id} ${s.weaponId}: ${s.finalRoll}→${s.hit?s.damageType!.toUpperCase():'miss'}`);
                log(`    Morale: ${nf.id}=${combat.attackerMorale?.result} ${wf.id}=${combat.defenderMorale?.result}`);

                const beforeN = state.flights[nf.id].aircraft.filter(a => a.damage !== 'shotdown').length;
                const beforeW = state.flights[wf.id].aircraft.filter(a => a.damage !== 'shotdown').length;
                state = applyCombatResults(state, nf.id, wf.id, combat);
                const afterN = state.flights[nf.id].aircraft.filter(a => a.damage !== 'shotdown').length;
                const afterW = state.flights[wf.id].aircraft.filter(a => a.damage !== 'shotdown').length;

                wpKills += (beforeN - afterN);
                natoKills += (beforeW - afterW);

                log(`    → ${nf.id}[${fs(state.flights[nf.id])}] ${wf.id}[${fs(state.flights[wf.id])}]`);
              }
              break;
            }
          }

          // Bot-initiated combat (WP flights engaging NATO)
          const { state: afterBotCombat, log: botCombatLog } = executeBotCombat(state, 'wp');
          state = afterBotCombat;
          for (const l of botCombatLog) log(`  [AI COMBAT] ${l}`);

          break;
        }
        case 'fuel': {
          for (const [id, f] of Object.entries(state.flights)) {
            const pts = shouldMarkFuel(f, f.throttle === 'dash', false);
            if (pts > 0) state = { ...state, flights: { ...state.flights, [id]: { ...f, fuelUsed: f.fuelUsed + pts } } };
          }
          break;
        }
        case 'samLocation': break;
        case 'track': {
          const { state: s } = applyTrackPhase(state);
          state = s;
          break;
        }
        case 'samAcquisition': {
          const all = [...runSAMAcquisitionPhase(state, 'nato'), ...runSAMAcquisitionPhase(state, 'wp')];
          state = applyAcquisitionResults(state, all);
          for (const a of all) if (a.result !== 'none') log(`[ACQ] ${a.samId}→${a.targetId}: ${a.result.toUpperCase()}`);
          break;
        }
        case 'admin': {
          const flights: Record<string, FlightState> = {};
          for (const [id, f] of Object.entries(state.flights))
            flights[id] = { ...f, hasMoved: false, hasMovedThisPhase: false, markers: f.markers.filter(m => m !== 'zoomClimb' && m !== 'maxTurn' && m !== 'antiRadarTactics') };
          state = { ...state, flights };
          break;
        }
      }
      state = advancePhase(state);
      if (state.turn > turn || state.phase === 'completed') break;
    }

    // Summary
    log(`  Kills so far: NATO=${natoKills} WP=${wpKills}`);
    for (const f of Object.values(state.flights)) {
      const alive = f.aircraft.filter(a => a.damage !== 'shotdown').length;
      if (alive < f.aircraft.length || f.disordered || f.aborted)
        log(`  ${f.id}(${f.side}): ${fs(f)} @ ${hexToId(f.hex)}`);
    }
    if (state.phase === 'completed') break;
  }

  section('FINAL RESULTS');
  const nVP = calculateVP(state, 'nato');
  const wVP = calculateVP(state, 'wp');
  const v = determineVictoryLevel(nVP.total, wVP.total, 'nato');

  log('\nAll flights:');
  for (const f of Object.values(state.flights))
    log(`  ${f.id}(${f.side} ${f.aircraftType}): ${fs(f)} @ ${hexToId(f.hex)} fuel=${f.fuelUsed}/${f.fuelAllowance}`);

  log(`\nNATO VP: ${nVP.total} (kills:${nVP.aircraftShotDown} dmg:${nVP.aircraftDamaged} gnd:${nVP.groundTargets})`);
  log(`WP VP:   ${wVP.total} (kills:${wVP.aircraftShotDown} dmg:${wVP.aircraftDamaged})`);
  log(`Kills: NATO ${natoKills} destroyed : WP ${wpKills} destroyed`);
  log(`\n>>> VERDICT: ${v.level.toUpperCase()} (margin ${v.margin}) <<<`);
  log(`Combats: ${combats}`);
}

playRS07();
