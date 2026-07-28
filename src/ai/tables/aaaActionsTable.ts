/**
 * Bot AAA Activation and Actions Tables.
 *
 * Reference: Rules 33.5, Player Aid Card 5
 */

import { GroundUnitState, FlightState, GameState } from '../../engine/state/GameState';
import { hexDistance } from '../../engine/hex';
import { roll1d10 } from '../../engine/rules/detection';

// ── AAA Activation ───────────────────────────────────────────────

export interface AAAActivationResult {
  inactiveAAAId: string;
  activated: boolean;
  aaaType: string | null;      // 'light' | 'medium' | 'heavy' | '2k22' | 'fire_can' etc.
  concentration: string | null;
  hasFireCan: boolean;
  roll: number;
  needed: number;
}

/**
 * Attempt to activate an inactive AAA marker into a real AAA unit.
 *
 * @param realAAAInPlay Number of real AAA already in play
 * @param aaaTypeTable Scenario-provided: roll -> AAA type
 */
export function attemptAAAActivation(
  inactiveId: string,
  triggerDistance: number,
  realAAAInPlay: number,
  aaaTypeTable: { minRoll: number; maxRoll: number; aaaType: string; concentration?: string; hasFireCan?: boolean }[]
): AAAActivationResult {
  const roll = roll1d10();
  let needed = 5;

  if (triggerDistance <= 2) needed -= 2;
  else if (triggerDistance <= 4) needed -= 1;
  else if (triggerDistance >= 8) needed += 1;

  if (realAAAInPlay >= 6) needed += 3;
  else if (realAAAInPlay >= 4) needed += 2;
  else if (realAAAInPlay >= 2) needed += 1;

  const activated = roll >= needed;

  let aaaType: string | null = null;
  let concentration: string | null = null;
  let hasFireCan = false;

  if (activated) {
    const typeRoll = roll1d10();
    for (const entry of aaaTypeTable) {
      if (typeRoll >= entry.minRoll && typeRoll <= entry.maxRoll) {
        aaaType = entry.aaaType;
        concentration = entry.concentration ?? null;
        hasFireCan = entry.hasFireCan ?? false;
        break;
      }
    }
  }

  return { inactiveAAAId: inactiveId, activated, aaaType, concentration, hasFireCan, roll, needed };
}

// ── AAA Bot Behavior ─────────────────────────────────────────────

export type AAABotAction =
  | { type: 'activate'; reason: string }
  | { type: 'fireBarrage'; targetId: string; reason: string }
  | { type: 'fireRadarAAA'; targetId: string; reason: string }
  | { type: 'fireMobileAAA'; targetId: string; reason: string }
  | { type: 'holdFire'; reason: string };

/**
 * Determine AAA bot actions during enemy movement.
 * AAA fires are mostly automatic based on barrage zones,
 * but Radar AAA and Mobile AAA need targeting decisions.
 */
export function determineAAAAction(
  aaa: GroundUnitState,
  movingFlight: FlightState,
  gameState: GameState
): AAABotAction {
  const dist = hexDistance(aaa.hex, movingFlight.hex);

  // Radar AAA (Fire Can): fire at enemy within 2 hexes if radar on
  if (aaa.type === 'radarAAA') {
    if (!aaa.radarOn) return { type: 'holdFire', reason: 'Radar off' };
    if (dist <= 2) {
      return { type: 'fireRadarAAA', targetId: movingFlight.id, reason: `Fire Can engaging at ${dist} hexes` };
    }
    return { type: 'holdFire', reason: 'Target out of range' };
  }

  // Mobile AAA: fire at enemy within 1 hex if radar on
  if (aaa.type === 'mobileAAA' || aaa.organicMobileAAA) {
    const radarOn = aaa.type === 'mobileAAA' ? aaa.radarOn : aaa.organicMobileRadarOn;
    if (!radarOn) {
      // Auto-activate radar when enemy enters range
      if (dist <= 1) {
        return { type: 'activate', reason: 'Activating radar — enemy in range' };
      }
      return { type: 'holdFire', reason: 'Radar off, target not in range' };
    }
    if (dist <= 1) {
      return { type: 'fireMobileAAA', targetId: movingFlight.id, reason: `Mobile AAA engaging at ${dist} hex` };
    }
    return { type: 'holdFire', reason: 'Target out of range' };
  }

  // AAA Concentration: barrage is automatic in zone, handled by movement rules
  if (aaa.type === 'aaaConcentation') {
    if (!aaa.active && dist <= 1) {
      return { type: 'activate', reason: 'Activating — enemy entering barrage zone' };
    }
  }

  return { type: 'holdFire', reason: 'No action needed' };
}
