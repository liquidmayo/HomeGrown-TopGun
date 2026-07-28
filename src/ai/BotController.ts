/**
 * Bot Controller — orchestrates all AI behavior for the FSP bot side.
 *
 * Reference: Rules 33.2 - 33.5
 *
 * The bot controller is called during each phase to determine
 * actions for bot-side flights, SAMs, and AAA.
 */

import { GameState, FlightState, Side, hexToId, DamageLevel } from '../engine/state/GameState';
import { hexDistance, getNeighbor, normalizeHeading, hexBearing } from '../engine/hex';
import { getAircraftData, getSpeed } from '../data/aircraft/aircraftDatabase';
import { canSAMFire, resolveSAMAttack } from '../engine/rules/sam';
import { allocateDamage, resolveStandardCombat, checkStandardEngagementPrereqs } from '../engine/rules/combat';
import { applyCombatResults } from '../engine/rules/applyCombat';
import { isInBarrageZone, resolveAAABarrage, resolveFireCanAttack, resolveMobileAAAAttack } from '../engine/rules/aaa';
import { canAttackGroundTargets, canAttackTarget, getAvailableProfiles, getTotalBombPoints, resolveAirToGroundAttack, resolveGroundDamage, applyGroundDamage } from '../engine/rules/bombing';
import {
  determineBotAction, resolveBotMovement, buildBotContext, BotAction,
} from './tables/flightActionsTable';
import {
  shouldActivateFlight, rollFlightType,
} from './tables/flightActivationTable';
import {
  determineSAMAction, attemptSAMActivation, SAMBotAction,
} from './tables/samActionsTable';
import {
  determineAAAAction, attemptAAAActivation, AAABotAction,
} from './tables/aaaActionsTable';
import { initializeMovement } from '../engine/rules/movement';

export interface BotTurnResult {
  flightActions: { flightId: string; action: BotAction; movement: ReturnType<typeof resolveBotMovement> }[];
  samActions: { samId: string; action: SAMBotAction }[];
  activations: {
    flights: { genericId: string; activated: boolean; type: string | null }[];
    sams: { warningId: string; activated: boolean; type: string | null }[];
  };
  log: string[];
}

/**
 * Execute a full bot turn during the Movement Phase.
 * Activates generic flights, moves all bot flights, and handles SAM/AAA.
 */
export function executeBotMovementPhase(
  gameState: GameState,
  botSide: Side
): BotTurnResult {
  const log: string[] = [];
  const flightActions: BotTurnResult['flightActions'] = [];
  const samActions: BotTurnResult['samActions'] = [];
  const activatedFlights: BotTurnResult['activations']['flights'] = [];
  const activatedSAMs: BotTurnResult['activations']['sams'] = [];

  // 1. Check for flight activations
  const genericFlights = Object.values(gameState.flights).filter(
    (f) => f.side === botSide && f.genericCounterId !== null && !f.isOnGround
  );

  const realFlightsCount = Object.values(gameState.flights).filter(
    (f) => f.side === botSide && f.genericCounterId === null && !f.isOnGround
  ).length;

  const maxReal = gameState.botState?.maxRealFlights ?? 10;

  for (const generic of genericFlights) {
    // Find nearest enemy
    let nearestDist = Infinity;
    for (const enemy of Object.values(gameState.flights)) {
      if (enemy.side === botSide) continue;
      if (enemy.isOnGround) continue;
      const d = hexDistance(generic.hex, enemy.hex);
      if (d < nearestDist) nearestDist = d;
    }

    const activationCheck = shouldActivateFlight(nearestDist, realFlightsCount, maxReal);
    activatedFlights.push({
      genericId: generic.id,
      activated: activationCheck.activate,
      type: activationCheck.activate ? 'activated' : null,
    });

    if (activationCheck.activate) {
      log.push(`${generic.id}: Activated (roll ${activationCheck.roll} vs ${activationCheck.needed})`);
    }
  }

  // 2. Determine actions for all bot flights
  const botFlights = Object.values(gameState.flights).filter(
    (f) => f.side === botSide && !f.isOnGround && !f.hasMovedThisPhase
  );

  for (const flight of botFlights) {
    const context = buildBotContext(flight, gameState);
    const action = determineBotAction(flight, gameState, context);
    const movement = resolveBotMovement(flight, action, gameState);

    flightActions.push({ flightId: flight.id, action, movement });
    log.push(`${flight.id}: ${action.reason} → hdg ${movement.heading}°, ${movement.throttle} spd ${movement.speed}`);
  }

  // 3. Determine SAM actions
  const botSAMs = Object.values(gameState.groundUnits).filter(
    (u) => u.side === botSide && u.type === 'sam' && u.damage !== 'destroyed'
  );

  for (const sam of botSAMs) {
    if (sam.isSAMWarning) continue; // Warnings handled separately
    const action = determineSAMAction(sam, gameState);
    samActions.push({ samId: sam.id, action });
    if (action.type !== 'holdFire') {
      log.push(`SAM ${sam.id}: ${action.reason}`);
    }
  }

  return {
    flightActions,
    samActions,
    activations: { flights: activatedFlights, sams: activatedSAMs },
    log,
  };
}

/**
 * Apply bot movement results to the game state.
 * Moves each bot flight according to its determined heading and speed.
 */
export function applyBotMovement(
  gameState: GameState,
  botResult: BotTurnResult
): GameState {
  let state = { ...gameState, flights: { ...gameState.flights } };

  for (const fa of botResult.flightActions) {
    const flight = state.flights[fa.flightId];
    if (!flight) continue;

    // Initialize movement (ensure minimum speed of 3 for unknown aircraft)
    const speed = Math.max(3, fa.movement.speed);
    let updated = initializeMovement(flight, fa.movement.throttle, speed);

    // Determine target hex from the action
    let targetHex = updated.hex;
    if (fa.action.type === 'moveToward') targetHex = fa.action.targetHex;
    else if (fa.action.type === 'moveAway') {
      // Move away: pick neighbor furthest from threat
      targetHex = { col: flight.side === 'nato' ? 0 : 79, row: updated.hex.row };
    } else if (fa.action.type === 'rtb') {
      targetHex = { col: flight.side === 'nato' ? 0 : 79, row: updated.hex.row };
    } else if (fa.action.type === 'engage') {
      const t = state.flights[fa.action.targetId];
      if (t) targetHex = t.hex;
    }
    // Patrol/orbit: move in a small circle
    if (fa.action.type === 'patrol' || fa.action.type === 'orbit') {
      const pDir = (Math.floor(Math.random() * 6)) as 0|1|2|3|4|5;
      targetHex = getNeighbor(updated.hex, pDir);
    }

    // Move toward target hex step by step, with AAA and combat checks
    const enemySide: Side = flight.side === 'nato' ? 'wp' : 'nato';
    let flightDestroyed = false;

    for (let mp = 0; mp < speed; mp++) {
      let bestDir: 0|1|2|3|4|5 = 0;
      let bestDist = Infinity;
      for (let d = 0; d < 6; d++) {
        const n = getNeighbor(updated.hex, d as 0|1|2|3|4|5);
        const dist = hexDistance(n, targetHex);
        if (dist < bestDist && n.col >= 0 && n.col <= 79 && n.row >= 0 && n.row <= 50) {
          bestDist = dist;
          bestDir = d as 0|1|2|3|4|5;
        }
      }
      const nextHex = getNeighbor(updated.hex, bestDir);
      const dirToHeading: Record<number,number> = {0:0,1:300,2:240,3:180,4:120,5:60};
      updated = { ...updated, hex: nextHex, heading: dirToHeading[bestDir] ?? 0, mpRemaining: updated.mpRemaining - 1 };

      // AAA fire at new hex
      const aaaUnits = isInBarrageZone(nextHex, state);
      for (const aaa of aaaUnits) {
        if (aaa.side === flight.side) continue;
        const result = resolveAAABarrage(aaa, updated, state);
        if (result.hit && result.damageResult && result.damageResult !== 'none') {
          const dmg = allocateDamage(updated, result.damageResult);
          updated = { ...updated, aircraft: updated.aircraft.map(a => a.index === dmg.aircraftIndex ? { ...a, damage: dmg.resultingDamage } : a) };
          if (updated.aircraft.every(a => a.damage === 'shotdown')) { flightDestroyed = true; break; }
        }
      }
      if (flightDestroyed) break;

      // Combat check: if CAP flight adjacent to detected enemy, engage
      if ((updated.task === 'cap' || updated.task === 'closeEscort') && !updated.disordered &&
          updated.aircraft.some(a => a.damage !== 'shotdown' && a.airToAirWeapons.some(w => !w.depleted))) {
        for (const enemy of Object.values(state.flights)) {
          if (enemy.side !== enemySide || !enemy.detected || enemy.isOnGround) continue;
          if (enemy.aircraft.every(a => a.damage === 'shotdown')) continue;
          if (hexDistance(updated.hex, enemy.hex) > 1) continue;

          const check = checkStandardEngagementPrereqs(updated, enemy, state);
          if (check.canEngage) {
            const combat = resolveStandardCombat(updated, enemy, state.timeOfDay === 'day');
            if (combat.engagement.combatOccurs) {
              // Apply combat and consume remaining MP
              state = applyCombatResults({ ...state, flights: { ...state.flights, [fa.flightId]: updated } }, fa.flightId, enemy.id, combat);
              updated = state.flights[fa.flightId];
            }
            updated = { ...updated, mpRemaining: 0 };
            break;
          }
        }
        if (updated.mpRemaining <= 0) break;
      }
    }

    // Mark as moved
    updated = { ...updated, hasMovedThisPhase: true, hasMoved: true, mpRemaining: 0 };
    state.flights[fa.flightId] = updated;

    // Bot bombing: if bombing flight near a target, execute attack
    if (!flightDestroyed && canAttackGroundTargets(updated)) {
      const bombPts = getTotalBombPoints(updated);
      if (bombPts > 0) {
        for (const [uid, unit] of Object.entries(state.groundUnits)) {
          if (unit.side === flight.side || unit.damage === 'destroyed') continue;
          if (hexDistance(updated.hex, unit.hex) > 1) continue;
          if (!canAttackTarget(updated, unit.type, true, 0)) continue;

          const profiles = getAvailableProfiles(updated, unit.hex, state);
          if (profiles.length === 0) continue;
          const profile = profiles[0]; // Pick first available

          const tgtProfile = unit.type === 'armor' || unit.type === 'mech' ? 'B' as const
            : unit.type === 'artillery' || unit.type === 'aaaConcentation' || unit.type === 'radarAAA' || unit.type === 'mobileAAA' ? 'C' as const
            : 'D' as const;

          const atkResult = resolveAirToGroundAttack(updated, unit, profile, bombPts, tgtProfile, 0, 0);
          if (atkResult.attackSuccess > 0) {
            const dmgResult = resolveGroundDamage(uid, atkResult.attackSuccess);
            if (dmgResult.result !== 'noEffect') {
              state.groundUnits[uid] = applyGroundDamage(unit, dmgResult.result);
            }
          }

          // Expend ordnance
          updated = { ...updated, aircraft: updated.aircraft.map(a => ({ ...a, bombStrengthRemaining: 0 })) };
          state.flights[fa.flightId] = updated;
          break; // One attack per flight
        }
      }
    }
  }

  return state;
}

/**
 * Execute bot air-to-air combat.
 * Bot flights that end movement adjacent to detected enemy flights attempt engagement.
 */
export function executeBotCombat(
  gameState: GameState,
  botSide: Side
): { state: GameState; log: string[] } {
  const log: string[] = [];
  let state = gameState;
  const enemySide: Side = botSide === 'nato' ? 'wp' : 'nato';

  const botFlights = Object.values(state.flights).filter(
    (f) => f.side === botSide && !f.isOnGround && f.hasMoved &&
    !f.disordered && !f.aborted &&
    f.aircraft.some((a) => a.damage !== 'shotdown' && a.airToAirWeapons.some((w) => !w.depleted))
  );

  for (const bf of botFlights) {
    const current = state.flights[bf.id];
    if (!current || current.disordered || current.aborted) continue;
    if (current.aircraft.every((a) => a.damage === 'shotdown')) continue;
    if (current.task !== 'cap' && current.task !== 'closeEscort' && current.task !== 'rescueSupport') continue;

    const enemies = Object.values(state.flights).filter(
      (f) => f.side === enemySide && f.detected && !f.isOnGround &&
      f.aircraft.some((a) => a.damage !== 'shotdown') &&
      hexDistance(current.hex, f.hex) <= 1
    );

    for (const enemy of enemies) {
      const check = checkStandardEngagementPrereqs(current, enemy, state);
      if (!check.canEngage) continue;

      const combat = resolveStandardCombat(current, enemy, state.timeOfDay === 'day');
      log.push(`${bf.id}(${bf.aircraftType}) engages ${enemy.id}(${enemy.aircraftType}): ${combat.engagement.outcome}`);

      if (combat.engagement.combatOccurs) {
        for (const s of combat.attackerShots) {
          if (s.hit) log.push(`  ${bf.id} ${s.weaponId}: ${s.damageType!.toUpperCase()}`);
        }
        for (const s of combat.defenderShots) {
          if (s.hit) log.push(`  ${enemy.id} ${s.weaponId}: ${s.damageType!.toUpperCase()}`);
        }
        state = applyCombatResults(state, bf.id, enemy.id, combat);

        const afterBot = state.flights[bf.id];
        const afterEnemy = state.flights[enemy.id];
        const bAlive = afterBot.aircraft.filter((a) => a.damage !== 'shotdown').length;
        const eAlive = afterEnemy.aircraft.filter((a) => a.damage !== 'shotdown').length;
        log.push(`  Result: ${bf.id}=${bAlive}/${bf.aircraft.length}ac ${enemy.id}=${eAlive}/${enemy.aircraft.length}ac`);
      }
      break; // One combat per bot flight
    }
  }

  return { state, log };
}

/**
 * Launch QRA flights that are on the ground when enemy is detected.
 * Returns updated state with QRA flights now airborne.
 */
export function launchQRAFlights(
  gameState: GameState,
  side: Side
): { state: GameState; log: string[] } {
  const log: string[] = [];
  let state = { ...gameState, flights: { ...gameState.flights } };
  const enemySide: Side = side === 'nato' ? 'wp' : 'nato';

  // Check if any enemy is detected
  const enemyDetected = Object.values(state.flights).some(
    (f) => f.side === enemySide && f.detected && !f.isOnGround
  );

  if (!enemyDetected) return { state, log };

  for (const [id, flight] of Object.entries(state.flights)) {
    if (flight.side !== side) continue;
    if (!flight.isOnGround) continue;
    if (flight.groundState !== 'ready') continue;

    // Launch QRA
    state.flights[id] = {
      ...flight,
      isOnGround: false,
      groundState: null,
      altitude: 'low',
      detected: false,
    };
    log.push(`QRA ${id} (${flight.aircraftType}) launched from ${hexToId(flight.hex)}`);
  }

  return { state, log };
}

/**
 * Execute bot SAM attacks during/after movement.
 * SAMs with acquisition fire at targets in range.
 */
export function executeBotSAMAttacks(
  gameState: GameState,
  botSide: Side
): { state: GameState; log: string[] } {
  const log: string[] = [];
  let state = { ...gameState, flights: { ...gameState.flights }, groundUnits: { ...gameState.groundUnits } };

  const botSAMs = Object.values(state.groundUnits).filter(
    (u) => u.side === botSide && u.type === 'sam' && u.damage !== 'destroyed' && u.radarOn && !u.isSAMWarning
  );

  // Track attacks per flight this turn
  const attacksPerFlight: Record<string, number> = {};

  for (const sam of botSAMs) {
    const action = determineSAMAction(sam, state);
    if (action.type !== 'fireAtTarget') continue;

    const target = state.flights[action.targetId];
    if (!target) continue;

    const prevAttacks = attacksPerFlight[action.targetId] ?? 0;
    const check = canSAMFire(sam, target, state, prevAttacks);
    if (!check.canFire) continue;

    const result = resolveSAMAttack(sam, target, state, action.salvo);
    log.push(`SAM ${sam.id} fires at ${action.targetId}: ${result.attackResult}${result.attackResult === 'possibleHit' ? ` → defense: ${result.defenseResult}` : ''}`);

    // Deduct ammo
    const updatedSAM = { ...state.groundUnits[sam.id], ammoRemaining: sam.ammoRemaining - result.ammoUsed };
    state.groundUnits[sam.id] = updatedSAM;
    attacksPerFlight[action.targetId] = prevAttacks + 1;

    // Apply damage
    if (result.damageResult && result.damageResult !== 'none') {
      const dmgAlloc = allocateDamage(target, result.damageResult);
      log.push(`  HIT! Aircraft #${dmgAlloc.aircraftIndex} → ${dmgAlloc.resultingDamage.toUpperCase()}`);

      const updatedAircraft = target.aircraft.map((ac) => {
        if (ac.index === dmgAlloc.aircraftIndex) {
          return { ...ac, damage: dmgAlloc.resultingDamage };
        }
        return ac;
      });

      const shotDown = dmgAlloc.resultingDamage === 'shotdown';
      state.flights[action.targetId] = {
        ...target,
        aircraft: updatedAircraft,
        // Check if all aircraft shot down
        ...(updatedAircraft.every((a) => a.damage === 'shotdown') ? { isOnGround: false } : {}),
      };
    } else if (result.defenseResult === 'samAvoidance') {
      log.push(`  ${action.targetId} performs SAM avoidance maneuver`);
    }
  }

  return { state, log };
}

/**
 * Execute bot SAM acquisition phase.
 */
export function executeBotSAMAcquisition(
  gameState: GameState,
  botSide: Side
): { actions: { samId: string; action: SAMBotAction }[]; log: string[] } {
  const actions: { samId: string; action: SAMBotAction }[] = [];
  const log: string[] = [];

  const botSAMs = Object.values(gameState.groundUnits).filter(
    (u) => u.side === botSide && u.type === 'sam' && u.damage !== 'destroyed' && u.radarOn
  );

  for (const sam of botSAMs) {
    if (sam.isSAMWarning) continue;
    const action = determineSAMAction(sam, gameState);
    actions.push({ samId: sam.id, action });
    if (action.type !== 'holdFire') {
      log.push(`SAM ${sam.id}: ${action.reason}`);
    }
  }

  return { actions, log };
}
