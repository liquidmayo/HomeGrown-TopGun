/**
 * Bot SAM Activation and Actions Tables.
 *
 * Reference: Rules 33.4, Player Aid Card 5
 *
 * SAM Warning markers activate into real SAMs probabilistically.
 * Activated SAMs follow priority-based behavior rules.
 */

import { GroundUnitState, FlightState, GameState, HexCoord, hexToId } from '../../engine/state/GameState';
import { hexDistance } from '../../engine/hex';
import { getSAMType } from '../../data/sams/samDatabase';
import { roll1d10 } from '../../engine/rules/detection';

// ── SAM Activation (33.4) ────────────────────────────────────────

export interface SAMActivationResult {
  samWarningId: string;
  activated: boolean;
  samType: string | null;
  roll: number;
  needed: number;
}

/**
 * Attempt to activate a SAM Warning marker into a real SAM.
 * Rule 33.4: Modifiers based on number of real SAMs already in play.
 *
 * @param triggerDistance Distance to the human flight that triggered activation
 * @param realSAMsInPlay Number of real SAMs (including IR) already in play
 * @param samTypeTable Scenario-provided table: roll -> SAM type
 */
export function attemptSAMActivation(
  samWarningId: string,
  triggerDistance: number,
  realSAMsInPlay: number,
  samTypeTable: { minRoll: number; maxRoll: number; samType: string }[]
): SAMActivationResult {
  const roll = roll1d10();
  let needed = 5; // Base activation threshold

  // Distance modifier
  if (triggerDistance <= 3) needed -= 2;
  else if (triggerDistance <= 6) needed -= 1;
  else if (triggerDistance >= 12) needed += 1;

  // Real SAMs in play modifier (harder to activate more)
  if (realSAMsInPlay >= 6) needed += 3;
  else if (realSAMsInPlay >= 4) needed += 2;
  else if (realSAMsInPlay >= 2) needed += 1;

  const activated = roll >= needed;

  let samType: string | null = null;
  if (activated) {
    // Roll for SAM type
    const typeRoll = roll1d10();
    for (const entry of samTypeTable) {
      if (typeRoll >= entry.minRoll && typeRoll <= entry.maxRoll) {
        samType = entry.samType;
        break;
      }
    }
    if (!samType && samTypeTable.length > 0) {
      samType = samTypeTable[0].samType;
    }
  }

  return { samWarningId, activated, samType, roll, needed };
}

// ── SAM Bot Behavior ─────────────────────────────────────────────

export type SAMBotAction =
  | { type: 'acquireTarget'; targetId: string; reason: string }
  | { type: 'fireAtTarget'; targetId: string; salvo: boolean; reason: string }
  | { type: 'maintainAcquisition'; targetId: string; reason: string }
  | { type: 'switchRadarOff'; reason: string }
  | { type: 'holdFire'; reason: string };

/**
 * Determine what a bot SAM should do.
 * Priority-based decision from SAM Actions Table (PAC5).
 */
export function determineSAMAction(
  sam: GroundUnitState,
  gameState: GameState
): SAMBotAction {
  const samType = getSAMType(sam.subType);
  if (!samType) return { type: 'holdFire', reason: 'Unknown SAM type' };

  // IR SAMs have simpler behavior
  if (samType.isIR) {
    return determineIRSAMAction(sam, gameState);
  }

  // Find best target
  const targets = findEligibleTargets(sam, gameState);

  // Priority 1: Fire at fully acquired target in range
  for (const target of targets) {
    const acqLevel = sam.acquisitions[target.id];
    if (acqLevel === 'full') {
      const dist = hexDistance(sam.hex, target.hex);
      if (dist <= samType.attackRange && dist >= samType.minRange) {
        // Salvo if target is high value or has jamming
        const useSalvo = sam.ammoRemaining >= 4 && target.aircraft.length >= 2;
        return {
          type: 'fireAtTarget',
          targetId: target.id,
          salvo: useSalvo,
          reason: `Full acquisition on ${target.id} — firing`,
        };
      }
    }
  }

  // Priority 2: Fire at partially acquired target if close
  for (const target of targets) {
    const acqLevel = sam.acquisitions[target.id];
    if (acqLevel === 'partial') {
      const dist = hexDistance(sam.hex, target.hex);
      if (dist <= samType.attackRange / 2) {
        return {
          type: 'fireAtTarget',
          targetId: target.id,
          salvo: false,
          reason: `Partial acquisition on ${target.id} at close range — firing`,
        };
      }
    }
  }

  // Priority 3: Maintain existing acquisition
  for (const [targetId, level] of Object.entries(sam.acquisitions)) {
    if (level !== 'none') {
      const target = gameState.flights[targetId];
      if (target && !target.isOnGround) {
        return {
          type: 'maintainAcquisition',
          targetId,
          reason: `Maintaining ${level} acquisition on ${targetId}`,
        };
      }
    }
  }

  // Priority 4: Acquire nearest enemy target
  if (targets.length > 0) {
    const nearest = targets[0]; // Already sorted by distance
    return {
      type: 'acquireTarget',
      targetId: nearest.id,
      reason: `Acquiring ${nearest.id} (${hexDistance(sam.hex, nearest.hex)} hexes)`,
    };
  }

  // Priority 5: Hold fire / switch radar off for protection
  if (sam.ammoRemaining <= 0) {
    return { type: 'switchRadarOff', reason: 'No ammo — switching radar off for protection' };
  }

  return { type: 'holdFire', reason: 'No eligible targets' };
}

/**
 * IR SAM behavior (simpler — no acquisition needed).
 */
function determineIRSAMAction(
  sam: GroundUnitState,
  gameState: GameState
): SAMBotAction {
  if (sam.ammoRemaining <= 0) {
    return { type: 'holdFire', reason: 'No ammo' };
  }

  const samType = getSAMType(sam.subType);
  if (!samType) return { type: 'holdFire', reason: 'Unknown type' };

  // Find closest enemy in range
  const enemySide = sam.side === 'nato' ? 'wp' : 'nato';
  let closest: FlightState | null = null;
  let closestDist = Infinity;

  for (const flight of Object.values(gameState.flights)) {
    if (flight.side !== enemySide) continue;
    if (flight.isOnGround) continue;

    const dist = hexDistance(sam.hex, flight.hex);
    if (dist <= samType.attackRange && dist < closestDist) {
      closest = flight;
      closestDist = dist;
    }
  }

  if (closest) {
    return {
      type: 'fireAtTarget',
      targetId: closest.id,
      salvo: false,
      reason: `IR tracking ${closest.id} at ${closestDist} hexes`,
    };
  }

  return { type: 'holdFire', reason: 'No targets in range' };
}

/**
 * Find eligible targets for a SAM, sorted by priority (closest first).
 */
function findEligibleTargets(
  sam: GroundUnitState,
  gameState: GameState
): FlightState[] {
  const samType = getSAMType(sam.subType);
  if (!samType) return [];

  const enemySide = sam.side === 'nato' ? 'wp' : 'nato';
  const targets: { flight: FlightState; dist: number }[] = [];

  for (const flight of Object.values(gameState.flights)) {
    if (flight.side !== enemySide) continue;
    if (flight.isOnGround) continue;

    const dist = hexDistance(sam.hex, flight.hex);
    if (dist > samType.acquisitionRange) continue;

    // Altitude check
    if (flight.altitude === 'deck' && !samType.canEngageDeck) continue;

    targets.push({ flight, dist });
  }

  // Sort by distance (closest first), then by detected status
  targets.sort((a, b) => {
    if (a.flight.detected !== b.flight.detected) return a.flight.detected ? -1 : 1;
    return a.dist - b.dist;
  });

  return targets.map((t) => t.flight);
}
