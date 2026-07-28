/**
 * Anti-Aircraft Artillery (AAA) rules.
 *
 * Reference: Rules section 14.0
 *
 * Three types of AAA:
 * 1. AAA Concentrations (Light/Medium/Heavy) - barrage zones
 * 2. Radar AAA (Fire Can) - targeted attacks
 * 3. Mobile AAA (Gepard/Vulcan/2K22) - targeted attacks
 *
 * AAA fires during enemy movement, triggered by entering/moving in barrage zones.
 */

import { FlightState, GroundUnitState, GameState, AltitudeBand, HexCoord, hexToId, DamageLevel } from '../state/GameState';
import { hexDistance, getNeighbors } from '../hex';
import { roll2d10 } from './detection';

// ── AAA Table Values ─────────────────────────────────────────────

/** AAA hit numbers by type and altitude. Roll >= this to hit. */
const AAA_HIT_TABLE: Record<string, Record<string, number>> = {
  light:  { deck: 9, low: 10, medium: 0, high: 0, veryHigh: 0 }, // 0 = can't hit
  medium: { deck: 7, low: 8, medium: 10, high: 0, veryHigh: 0 },
  heavy:  { deck: 5, low: 6, medium: 8, high: 10, veryHigh: 0 },
  small_arms: { deck: 10, low: 0, medium: 0, high: 0, veryHigh: 0 },
  fire_can: { deck: 5, low: 6, medium: 8, high: 10, veryHigh: 0 },
  gepard:  { deck: 5, low: 7, medium: 0, high: 0, veryHigh: 0 },
  vulcan:  { deck: 5, low: 7, medium: 0, high: 0, veryHigh: 0 },
  '2k22':  { deck: 4, low: 6, medium: 0, high: 0, veryHigh: 0 },
};

/** AAA modifier applied to bombing attacks (in parentheses on AAA Table). */
const AAA_BOMBING_MODIFIER: Record<string, number> = {
  light: -1,
  medium: -2,
  heavy: -3,
  fire_can: -2,
  gepard: -1,
  vulcan: -1,
  '2k22': -2,
};

// ── AAA Barrage (14.4) ───────────────────────────────────────────

export interface AAABarrageResult {
  aaaId: string;
  aaaType: string;
  targetId: string;
  roll: number;
  hitNumber: number;
  hit: boolean;
  damageRoll: number | null;
  damageResult: DamageLevel | null;
  bombingModifier: number;
}

/**
 * Check if a hex is in an AAA barrage zone.
 * Rule 14.4: Active AAA projects barrage into its hex and all adjacent hexes.
 */
export function isInBarrageZone(
  hex: HexCoord,
  gameState: GameState
): GroundUnitState[] {
  const units: GroundUnitState[] = [];

  for (const unit of Object.values(gameState.groundUnits)) {
    if (unit.type !== 'aaaConcentation') continue;
    if (!unit.active) continue;
    if (unit.damage === 'destroyed') continue;

    // Barrage covers AAA hex and all adjacent hexes
    const dist = hexDistance(unit.hex, hex);
    if (dist <= 1) {
      units.push(unit);
    }
  }

  return units;
}

/**
 * Resolve an AAA barrage attack on a flight.
 * Rule 14.41: Roll 2d10 on AAA Table.
 */
export function resolveAAABarrage(
  aaa: GroundUnitState,
  target: FlightState,
  _gameState: GameState
): AAABarrageResult {
  const concentration = aaa.concentration ?? 'light';
  const hitTable = AAA_HIT_TABLE[concentration];
  const hitNumber = hitTable?.[target.altitude] ?? 0;

  if (hitNumber === 0) {
    return {
      aaaId: aaa.id, aaaType: concentration, targetId: target.id,
      roll: 0, hitNumber: 0, hit: false, damageRoll: null, damageResult: null,
      bombingModifier: 0,
    };
  }

  const roll = roll2d10();
  const hit = roll >= hitNumber;

  let damageRoll: number | null = null;
  let damageResult: DamageLevel | null = null;

  if (hit) {
    damageRoll = roll2d10();
    damageResult = resolveAAADamage(damageRoll, concentration);
  }

  // Bombing modifier applies regardless of hit
  const baseBombMod = AAA_BOMBING_MODIFIER[concentration] ?? 0;
  const suppression = aaa.aaaSuppression;
  const bombingModifier = Math.min(0, baseBombMod + suppression); // Suppression reduces penalty

  return {
    aaaId: aaa.id, aaaType: concentration, targetId: target.id,
    roll, hitNumber, hit, damageRoll, damageResult, bombingModifier,
  };
}

// ── Radar AAA / Fire Can (14.5) ──────────────────────────────────

/**
 * Resolve a Fire Can (Radar AAA) attack.
 * Rule 14.53: Within 2 hexes, radar on, once per turn.
 */
export function resolveFireCanAttack(
  fireCan: GroundUnitState,
  target: FlightState,
  gameState: GameState
): AAABarrageResult {
  const hitTable = AAA_HIT_TABLE['fire_can'];
  const hitNumber = hitTable?.[target.altitude] ?? 0;

  if (hitNumber === 0 || !fireCan.radarOn) {
    return {
      aaaId: fireCan.id, aaaType: 'fire_can', targetId: target.id,
      roll: 0, hitNumber: 0, hit: false, damageRoll: null, damageResult: null,
      bombingModifier: 0,
    };
  }

  const dist = hexDistance(fireCan.hex, target.hex);
  if (dist > 2) {
    return {
      aaaId: fireCan.id, aaaType: 'fire_can', targetId: target.id,
      roll: 0, hitNumber: 0, hit: false, damageRoll: null, damageResult: null,
      bombingModifier: 0,
    };
  }

  const roll = roll2d10();
  const hit = roll >= hitNumber;

  let damageRoll: number | null = null;
  let damageResult: DamageLevel | null = null;

  if (hit) {
    damageRoll = roll2d10();
    damageResult = resolveAAADamage(damageRoll, 'fire_can');
  }

  return {
    aaaId: fireCan.id, aaaType: 'fire_can', targetId: target.id,
    roll, hitNumber, hit, damageRoll, damageResult,
    bombingModifier: AAA_BOMBING_MODIFIER['fire_can'] ?? 0,
  };
}

// ── Mobile AAA (14.6) ────────────────────────────────────────────

/**
 * Resolve a Mobile AAA (Gepard/Vulcan/2K22) attack.
 * Rule 14.63: Within 1 hex, radar on, once per turn.
 */
export function resolveMobileAAAAttack(
  mobileAAA: GroundUnitState,
  target: FlightState,
  gameState: GameState
): AAABarrageResult {
  const aaaType = mobileAAA.organicMobileAAA ?? mobileAAA.subType.toLowerCase();
  const hitTable = AAA_HIT_TABLE[aaaType];
  const hitNumber = hitTable?.[target.altitude] ?? 0;

  const radarOn = mobileAAA.type === 'mobileAAA' ? mobileAAA.radarOn : mobileAAA.organicMobileRadarOn;
  if (hitNumber === 0 || !radarOn) {
    return {
      aaaId: mobileAAA.id, aaaType, targetId: target.id,
      roll: 0, hitNumber: 0, hit: false, damageRoll: null, damageResult: null,
      bombingModifier: 0,
    };
  }

  const dist = hexDistance(mobileAAA.hex, target.hex);
  if (dist > 1) {
    return {
      aaaId: mobileAAA.id, aaaType, targetId: target.id,
      roll: 0, hitNumber: 0, hit: false, damageRoll: null, damageResult: null,
      bombingModifier: 0,
    };
  }

  const roll = roll2d10();
  const hit = roll >= hitNumber;

  let damageRoll: number | null = null;
  let damageResult: DamageLevel | null = null;

  if (hit) {
    damageRoll = roll2d10();
    damageResult = resolveAAADamage(damageRoll, aaaType);
  }

  return {
    aaaId: mobileAAA.id, aaaType, targetId: target.id,
    roll, hitNumber, hit, damageRoll, damageResult,
    bombingModifier: AAA_BOMBING_MODIFIER[aaaType] ?? 0,
  };
}

// ── AAA Damage Resolution ────────────────────────────────────────

/**
 * Resolve AAA damage from a hit.
 * Simplified AAA Damage Table.
 */
function resolveAAADamage(roll: number, aaaType: string): DamageLevel {
  // Different AAA types have different damage severity
  const isHeavy = aaaType === 'heavy' || aaaType === '2k22' || aaaType === 'fire_can';

  if (isHeavy) {
    if (roll >= 18) return 'shotdown';
    if (roll >= 14) return 'crippled';
    if (roll >= 8) return 'damaged';
    return 'none';
  }

  // Light/medium/mobile AAA
  if (roll >= 19) return 'shotdown';
  if (roll >= 16) return 'crippled';
  if (roll >= 10) return 'damaged';
  return 'none';
}

// ── AAA Suppression (18.21) ──────────────────────────────────────

/**
 * Roll for AAA suppression recovery.
 * Rule 18.21: Roll die in Admin Phase, 8+ reduces suppression by 1.
 */
export function rollSuppressionRecovery(currentLevel: number): number {
  if (currentLevel <= 0) return 0;
  const roll = Math.floor(Math.random() * 10) + 1;
  return roll >= 8 ? currentLevel - 1 : currentLevel;
}
