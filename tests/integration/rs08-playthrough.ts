/**
 * RS8: Runway Busting — Full NATO playthrough v2.
 * Fixes: bomber advancement, WP AI pursuit, SAM damage, longer run.
 */

import { loadScenario } from '../../src/engine/scenarioLoader';
import { advancePhase } from '../../src/engine/controller/PhaseStateMachine';
import { rollInitiative, executeChitDraw, getMovableFlights, getNextChitDrawSide } from '../../src/engine/rules/initiative';
import { initializeMovement } from '../../src/engine/rules/movement';
import { runDetectionPhase, applyDetectionResults, applyTrackPhase } from '../../src/engine/rules/detection';
import { rollRandomEvent } from '../../src/engine/rules/randomEvents';
import { runSAMAcquisitionPhase, applyAcquisitionResults } from '../../src/engine/rules/sam';
import { executeBotMovementPhase, applyBotMovement, executeBotSAMAttacks } from '../../src/ai/BotController';
import { resolveStandardCombat, checkStandardEngagementPrereqs, allocateDamage } from '../../src/engine/rules/combat';
import { resolveAirToGroundAttack, resolveGroundDamage, applyGroundDamage } from '../../src/engine/rules/bombing';
import { calculateVP, determineVictoryLevel } from '../../src/engine/rules/victory';
import { shouldMarkFuel } from '../../src/engine/rules/fuel';
import { GameState, FlightState, hexToId, Side } from '../../src/engine/state/GameState';
import { hexDistance, getNeighbor, hexBearing, normalizeHeading } from '../../src/engine/hex';
import { getAircraftData, getSpeed } from '../../src/data/aircraft/aircraftDatabase';

function log(msg: string) { console.log(msg); }
function section(t: string) { log(`\n${'═'.repeat(60)}\n  ${t}\n${'═'.repeat(60)}`); }

/**
 * Move a flight toward a target hex, stepping one hex at a time
 * using the neighbor that is closest to the target.
 */
function moveFlight(state: GameState, fid: string, targetHex: {col:number,row:number}, throttle: 'combat'|'dash'): GameState {
  const f = state.flights[fid];
  if (!f) return state;
  const ac = getAircraftData(f.aircraftType);
  const laden = f.aircraft.some(a => a.bombStrengthRemaining > 0);
  const speed = Math.max(1, getSpeed(ac!, f.altitude, throttle, laden) ?? 4);
  let u = initializeMovement(f, throttle, speed);

  for (let i = 0; i < speed; i++) {
    // Find the neighbor hex closest to the target
    let bestDir: 0|1|2|3|4|5 = 0;
    let bestDist = Infinity;
    for (let d = 0; d < 6; d++) {
      const n = getNeighbor(u.hex, d as 0|1|2|3|4|5);
      const dist = hexDistance(n, targetHex);
      if (dist < bestDist && n.col >= 0 && n.col <= 79 && n.row >= 0 && n.row <= 50) {
        bestDist = dist;
        bestDir = d as 0|1|2|3|4|5;
      }
    }
    const next = getNeighbor(u.hex, bestDir);
    // Update heading to match direction
    const dirToHeading: Record<number, number> = { 0:0, 1:300, 2:240, 3:180, 4:120, 5:60 };
    u = { ...u, hex: next, heading: dirToHeading[bestDir] ?? 0, mpRemaining: u.mpRemaining - 1 };
  }
  return { ...state, flights: { ...state.flights, [fid]: { ...u, hasMovedThisPhase: true, hasMoved: true, mpRemaining: 0 } } };
}

function playRS8() {
  section('RS8: RUNWAY BUSTING — FULL PLAYTHROUGH');
  let state = loadScenario('rs08');

  log(`\nLoaded: ${state.scenarioName}`);
  log(`NATO: ${Object.values(state.flights).filter(f=>f.side==='nato').map(f=>`${f.id}(${f.aircraftType})`).join(', ')}`);
  log(`WP:   ${Object.values(state.flights).filter(f=>f.side==='wp').map(f=>`${f.id}(${f.aircraftType})`).join(', ')}`);
  log(`SAMs: ${Object.values(state.groundUnits).filter(u=>u.type==='sam').map(u=>`${u.id}(${u.subType}@${hexToId(u.hex)})`).join(', ')}`);

  state = advancePhase(state); // Setup -> Jamming (T1)

  const MAX_TURNS = 15;
  let totalCombats = 0;
  let totalSAMFires = 0;
  let bombingDone = false;

  for (let turn = 1; turn <= MAX_TURNS; turn++) {
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
        case 'jamming': break; // No jammers

        case 'detection': {
          const res = runDetectionPhase(state);
          state = applyDetectionResults(state, res);
          const det = res.filter(r => r.detected);
          if (res.length > 0) {
            for (const r of res) log(`[Det] ${r.targetId}: ${r.method} roll ${r.roll}/${r.needed} → ${r.detected ? 'DETECTED' : 'miss'}`);
          }
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
              // NATO strategy
              const movable = getMovableFlights(state, 'nato').slice(0, chit.flightsToMove);
              for (const fid of movable) {
                const f = state.flights[fid];
                let target: {col:number,row:number};
                let thr: 'combat' | 'dash' = 'combat';

                if (f.task === 'bombing' || f.task === 'sead') {
                  target = f.task === 'bombing'
                    ? { col: 73, row: 6 }
                    : { col: 65, row: 5 };
                  thr = 'combat';
                } else {
                  const wpDetected = Object.values(state.flights)
                    .filter(w => w.side === 'wp' && w.detected && !w.isOnGround)
                    .sort((a, b) => hexDistance(f.hex, a.hex) - hexDistance(f.hex, b.hex));
                  if (wpDetected.length > 0 && hexDistance(f.hex, wpDetected[0].hex) < 20) {
                    target = wpDetected[0].hex;
                    thr = 'dash';
                  } else {
                    target = { col: 65, row: f.hex.row };
                    thr = 'dash';
                  }
                }

                state = moveFlight(state, fid, target, thr);
                const moved = state.flights[fid];
                log(`  NATO ${fid} → ${hexToId(moved.hex)} hdg=${moved.heading}° ${thr}`);
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

          // Post-movement: SAM attacks from WP SAMs on NATO flights
          const { state: afterSAM, log: samLog } = executeBotSAMAttacks(state, 'wp');
          state = afterSAM;
          totalSAMFires += samLog.length;
          for (const sl of samLog) log(`  [SAM] ${sl}`);

          // Post-movement: NATO SAM attacks on WP flights
          const { state: afterNATOSAM, log: natoSamLog } = executeBotSAMAttacks(state, 'nato');
          state = afterNATOSAM;
          for (const sl of natoSamLog) log(`  [SAM] ${sl}`);

          // Air-to-air combat check
          for (const nf of Object.values(state.flights).filter(f => f.side === 'nato' && f.task === 'cap' && !f.disordered && f.hasMoved)) {
            for (const wf of Object.values(state.flights).filter(f => f.side === 'wp' && f.detected && !f.isOnGround)) {
              const dist = hexDistance(nf.hex, wf.hex);
              if (dist <= 1) {
                const check = checkStandardEngagementPrereqs(nf, wf, state);
                if (check.canEngage) {
                  log(`\n  *** COMBAT: ${nf.id} vs ${wf.id} ***`);
                  const combat = resolveStandardCombat(nf, wf, true);
                  totalCombats++;
                  log(`    Engagement: ${combat.engagement.outcome}${combat.engagement.attackerHasSurprise ? ' (SURPRISE!)' : ''}`);
                  if (combat.engagement.combatOccurs) {
                    log(`    ${nf.id}: ${combat.attackerManeuver?.shotOpportunities} shots | ${wf.id}: ${combat.defenderManeuver?.shotOpportunities} shots`);
                    for (const s of combat.attackerShots) log(`    ${nf.id} → ${s.weaponId}: ${s.finalRoll} = ${s.hit ? s.damageType!.toUpperCase() : 'MISS'}`);
                    for (const s of combat.defenderShots) log(`    ${wf.id} → ${s.weaponId}: ${s.finalRoll} = ${s.hit ? s.damageType!.toUpperCase() : 'MISS'}`);
                    // Apply damage
                    for (const d of combat.damageAllocations) {
                      log(`    DMG: AC#${d.aircraftIndex} ${d.previousDamage}→${d.resultingDamage.toUpperCase()}`);
                    }
                    log(`    Morale: ${nf.id}=${combat.attackerMorale?.result} ${wf.id}=${combat.defenderMorale?.result}`);
                  }
                }
              }
            }
          }

          // Bombing check: if bombers near target, attempt attack
          for (const bf of Object.values(state.flights).filter(f => f.side === 'nato' && f.task === 'bombing' && !f.disordered)) {
            // Target: WP airfields at 7306 (Ballenstedt) or 7503 (Cochstedt)
            const targets = [{ col: 73, row: 6 }, { col: 75, row: 3 }];
            for (const tgt of targets) {
              const dist = hexDistance(bf.hex, tgt);
              if (dist <= 1 && !bombingDone) {
                log(`\n  *** BOMBING: ${bf.id} attacks airfield at ${hexToId(tgt)} ***`);
                // Find the airfield ground unit or create a virtual target
                const tgtId = hexToId(tgt);
                const bombPoints = bf.aircraft.reduce((s, a) => s + a.bombStrengthRemaining, 0);
                if (bombPoints > 0) {
                  const atkResult = resolveAirToGroundAttack(
                    bf, { id: tgtId, type: 'armor', subType: 'Airfield', side: 'wp', hex: tgt,
                      hidden: false, located: true, isSAMWarning: false, isDummy: false, radarOn: false,
                      ammoRemaining: 0, ammoMax: 0, acquisitions: {}, phasedArrayArc: null,
                      active: false, concentration: null, damage: 'none', radarSuppressedTurns: 0,
                      radarShutdown: false, aaaSuppression: 0, organicSmallArms: false,
                      organicLightAAA: false, organicMobileAAA: null, organicMobileRadarOn: false,
                    } as any,
                    'diveBombing', bombPoints, 'A', 0, 0
                  );
                  log(`    Profile: Dive Bombing, ${bombPoints} bomb pts`);
                  log(`    Roll: ${atkResult.roll} + mods = ${atkResult.finalRoll} → Success: ${atkResult.attackSuccess}`);
                  if (atkResult.attackSuccess > 0) {
                    const dmg = resolveGroundDamage(tgtId, atkResult.attackSuccess);
                    log(`    Damage: roll ${dmg.roll} → ${dmg.result.toUpperCase()}`);
                  }
                  // Expend ordnance
                  const updatedAc = bf.aircraft.map(a => ({ ...a, bombStrengthRemaining: 0 }));
                  state = { ...state, flights: { ...state.flights, [bf.id]: { ...bf, aircraft: updatedAc } } };
                  bombingDone = true;
                }
              }
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
          log(`[Fuel] ${n} flight(s) marked`);
          break;
        }
        case 'samLocation': break;
        case 'track': {
          const { state: s2, autoUndetected, trackResult } = applyTrackPhase(state);
          state = s2;
          if (autoUndetected.length > 0) log(`[Track] Auto-undetect: ${autoUndetected.join(', ')}`);
          log(`[Track] Roll ${trackResult.roll}`);
          break;
        }
        case 'samAcquisition': {
          const all = [...runSAMAcquisitionPhase(state, 'nato'), ...runSAMAcquisitionPhase(state, 'wp')];
          state = applyAcquisitionResults(state, all);
          for (const a of all) {
            if (a.result !== 'none') log(`[SAM Acq] ${a.samId}→${a.targetId}: ${a.result.toUpperCase()} (${a.roll}/${a.needed})`);
          }
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

    // End-of-turn status
    log(`\n--- Turn ${turn} Status ---`);
    for (const f of Object.values(state.flights)) {
      const alive = f.aircraft.filter(a => a.damage !== 'shotdown').length;
      log(`  ${f.id}(${f.side}): ${alive}/${f.aircraft.length} @ ${hexToId(f.hex)} ${f.altitude} fuel=${f.fuelUsed}/${f.fuelAllowance}${f.detected?' DET':''}${f.disordered?' DIS':''}${f.aborted?' ABT':''}`);
    }

    if (state.phase === 'completed') break;
  }

  // ── FINAL RESULTS ──
  section('FINAL RESULTS');
  const natoVP = calculateVP(state, 'nato');
  const wpVP = calculateVP(state, 'wp');
  const victory = determineVictoryLevel(natoVP.total, wpVP.total, 'nato');

  log(`NATO VP: ${natoVP.total} (air:${natoVP.aircraftShotDown} dmg:${natoVP.aircraftDamaged} gnd:${natoVP.groundTargets} sam:${natoVP.samDestroyed})`);
  log(`WP VP:   ${wpVP.total} (air:${wpVP.aircraftShotDown} dmg:${wpVP.aircraftDamaged})`);
  log(`RESULT:  ${victory.level.toUpperCase()} (margin ${victory.margin})`);
  log(`Combats: ${totalCombats} | SAM fires: ${totalSAMFires} | Bombing: ${bombingDone ? 'YES' : 'NO'}`);
}

playRS8();
