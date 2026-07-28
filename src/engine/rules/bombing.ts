/**
 * Air-to-Ground Attack and Bombing rules.
 *
 * Reference: Rules sections 16.0 - 18.0
 *
 * Key concepts:
 * - Flights must conduct a Bomb Run (17.2) to attack
 * - Multiple attack profiles determine how attacks are made (17.3)
 * - Air-to-Ground Attack Table resolves hits (17.4)
 * - Ground Target Damage Table resolves damage (18.0)
 * - ARMs (Anti-Radiation Missiles) use special procedures (17.5)
 */

import {
  FlightState, GroundUnitState, GameState, AltitudeBand,
  HexCoord, hexToId, DamageLevel,
} from '../state/GameState';
import { hexDistance, isInForwardArc, hasLineOfSight } from '../hex';
import { getAircraftData } from '../../data/aircraft/aircraftDatabase';
import { roll1d10, roll2d10 } from './detection';

// ── Attack Profiles (17.3) ───────────────────────────────────────

export type AttackProfile =
  | 'diveBombing'     // 17.31: Visual, IP 1 hex, Low+
  | 'levelBombing'    // 17.32: Visual, IP 1 hex
  | 'radarBombing'    // 17.33: Blind, IP 2 hex, radar required
  | 'tossBombing'     // 17.34: Blind, IP 3-5 hex, radar required
  | 'lgbLevel'        // 17.35: Visual, IP 1 hex, no Deck
  | 'lgbToss'         // 17.36: Visual, IP 3 hex, Deck/Low only
  | 'eogm'            // 17.37: Visual, IP 3 hex, attack 1-2 hex
  | 'eogb'            // 17.38: Visual, IP 8 hex, attack 5 hex, Medium only
  | 'strafe'          // 17.39: Visual, IP 1 hex, Deck only, Combat throttle
  | 'arm';            // 17.5: Anti-Radiation Missile

export interface AttackProfileInfo {
  id: AttackProfile;
  name: string;
  isVisual: boolean;          // Requires LOS
  ipDistance: number;          // Initial Point distance from target
  attackDistance: number;      // Distance from which attack occurs (0 = target hex)
  minAltitude: AltitudeBand | null;
  maxAltitude: AltitudeBand | null;
  requiresRadar: boolean;
  requiresLGB: boolean;
  requiresEOGM: boolean;
  requiresEOGB: boolean;
  requiresGun: boolean;
  modifier: number;            // DRM on Air-to-Ground Attack Table
}

export const ATTACK_PROFILES: Record<AttackProfile, AttackProfileInfo> = {
  diveBombing: {
    id: 'diveBombing', name: 'Dive Bombing', isVisual: true,
    ipDistance: 1, attackDistance: 0, minAltitude: 'low', maxAltitude: null,
    requiresRadar: false, requiresLGB: false, requiresEOGM: false,
    requiresEOGB: false, requiresGun: false, modifier: 1,
  },
  levelBombing: {
    id: 'levelBombing', name: 'Level Bombing', isVisual: true,
    ipDistance: 1, attackDistance: 0, minAltitude: null, maxAltitude: null,
    requiresRadar: false, requiresLGB: false, requiresEOGM: false,
    requiresEOGB: false, requiresGun: false, modifier: 0,
  },
  radarBombing: {
    id: 'radarBombing', name: 'Radar Bombing', isVisual: false,
    ipDistance: 2, attackDistance: 0, minAltitude: null, maxAltitude: null,
    requiresRadar: true, requiresLGB: false, requiresEOGM: false,
    requiresEOGB: false, requiresGun: false, modifier: -2,
  },
  tossBombing: {
    id: 'tossBombing', name: 'Toss Bombing', isVisual: false,
    ipDistance: 3, attackDistance: 2, minAltitude: null, maxAltitude: null,
    requiresRadar: true, requiresLGB: false, requiresEOGM: false,
    requiresEOGB: false, requiresGun: false, modifier: -4,
  },
  lgbLevel: {
    id: 'lgbLevel', name: 'LGB Level', isVisual: true,
    ipDistance: 1, attackDistance: 0, minAltitude: 'low', maxAltitude: null,
    requiresRadar: false, requiresLGB: true, requiresEOGM: false,
    requiresEOGB: false, requiresGun: false, modifier: 4,
  },
  lgbToss: {
    id: 'lgbToss', name: 'LGB Toss', isVisual: true,
    ipDistance: 3, attackDistance: 2, minAltitude: 'deck', maxAltitude: 'low',
    requiresRadar: false, requiresLGB: true, requiresEOGM: false,
    requiresEOGB: false, requiresGun: false, modifier: 2,
  },
  eogm: {
    id: 'eogm', name: 'EOGM', isVisual: true,
    ipDistance: 3, attackDistance: 1, minAltitude: null, maxAltitude: 'medium',
    requiresRadar: false, requiresLGB: false, requiresEOGM: true,
    requiresEOGB: false, requiresGun: false, modifier: 3,
  },
  eogb: {
    id: 'eogb', name: 'EOGB', isVisual: true,
    ipDistance: 8, attackDistance: 5, minAltitude: 'medium', maxAltitude: 'medium',
    requiresRadar: false, requiresLGB: false, requiresEOGM: false,
    requiresEOGB: true, requiresGun: false, modifier: 5,
  },
  strafe: {
    id: 'strafe', name: 'Strafe', isVisual: true,
    ipDistance: 1, attackDistance: 0, minAltitude: 'deck', maxAltitude: 'deck',
    requiresRadar: false, requiresLGB: false, requiresEOGM: false,
    requiresEOGB: false, requiresGun: true, modifier: -1,
  },
  arm: {
    id: 'arm', name: 'Anti-Radiation Missile', isVisual: false,
    ipDistance: 0, attackDistance: 0, minAltitude: null, maxAltitude: null,
    requiresRadar: false, requiresLGB: false, requiresEOGM: false,
    requiresEOGB: false, requiresGun: false, modifier: 0,
  },
};

// ── Target Profiles (17.13) ──────────────────────────────────────

export type TargetProfile = 'A' | 'B' | 'C' | 'D';

const TARGET_PROFILE_MODIFIER: Record<TargetProfile, number> = {
  'A': -4,  // Hardest (HAS, command bunkers)
  'B': -2,  // Hard (armor, revetments, fuel storage)
  'C': 0,   // Medium (artillery, radar AAA, SAM launchers)
  'D': 2,   // Soft (HQ, supply, EWR, aircraft on ground)
};

// ── Available Profiles Check ─────────────────────────────────────

/**
 * Get the attack profiles available to a flight for a given target.
 */
export function getAvailableProfiles(
  flight: FlightState,
  targetHex: HexCoord,
  gameState: GameState
): AttackProfile[] {
  const profiles: AttackProfile[] = [];
  const aircraft = getAircraftData(flight.aircraftType);
  if (!aircraft) return profiles;

  const dist = hexDistance(flight.hex, targetHex);
  const hasBombs = flight.aircraft.some((a) => a.bombStrengthRemaining > 0);
  const hasLGB = flight.aircraft.some((a) => a.ordnance.some((o) => o.type === 'lgb' && o.shotsRemaining > 0));
  const hasEOGM = flight.aircraft.some((a) => a.ordnance.some((o) => o.type === 'eogm' && o.shotsRemaining > 0));
  const hasEOGB = flight.aircraft.some((a) => a.ordnance.some((o) => o.type === 'eogb' && o.shotsRemaining > 0));
  const hasGun = flight.aircraft.some((a) => a.airToAirWeapons.some((w) => w.weaponId.startsWith('Gun') && !w.depleted));

  const getTerrain = (hex: HexCoord) => {
    const data = gameState.hexes[hexToId(hex)];
    return data?.terrain ?? ['land'];
  };
  const los = hasLineOfSight(flight.hex, targetHex, flight.altitude, 'deck', getTerrain);

  for (const [id, profile] of Object.entries(ATTACK_PROFILES)) {
    const p = id as AttackProfile;

    // Check altitude restrictions
    if (profile.minAltitude) {
      const altOrder = ['deck', 'low', 'medium', 'high', 'veryHigh'];
      if (altOrder.indexOf(flight.altitude) < altOrder.indexOf(profile.minAltitude)) continue;
    }
    if (profile.maxAltitude) {
      const altOrder = ['deck', 'low', 'medium', 'high', 'veryHigh'];
      if (altOrder.indexOf(flight.altitude) > altOrder.indexOf(profile.maxAltitude)) continue;
    }

    // Check ordnance requirements
    if (profile.requiresLGB && !hasLGB) continue;
    if (profile.requiresEOGM && !hasEOGM) continue;
    if (profile.requiresEOGB && !hasEOGB) continue;
    if (profile.requiresGun && !hasGun) continue;
    if (profile.requiresRadar && !aircraft.hasRadar) continue;

    // Standard bomb profiles need bombs
    if (!profile.requiresLGB && !profile.requiresEOGM && !profile.requiresEOGB &&
        !profile.requiresGun && p !== 'arm' && !hasBombs) continue;

    // Visual attacks need LOS
    if (profile.isVisual && !los) continue;

    // Strafe requires combat throttle
    if (p === 'strafe' && flight.throttle !== 'combat') continue;

    profiles.push(p);
  }

  return profiles;
}

// ── Air-to-Ground Attack Resolution (17.4) ───────────────────────

export interface AirToGroundResult {
  attackerId: string;
  targetId: string;
  profile: AttackProfile;
  attackColumn: number;
  roll: number;
  modifiers: Record<string, number>;
  finalRoll: number;
  attackSuccess: number;     // 0 = miss, 1+ = success value
  isPGM: boolean;
}

/**
 * Resolve an air-to-ground bomb attack.
 * Rule 17.4: Roll 2d10 on Air-to-Ground Attack Table.
 */
export function resolveAirToGroundAttack(
  flight: FlightState,
  target: GroundUnitState,
  profile: AttackProfile,
  bombPointsAllocated: number,
  targetProfile: TargetProfile,
  aaaModifier: number,
  samModifier: number
): AirToGroundResult {
  const profileInfo = ATTACK_PROFILES[profile];
  const aircraft = getAircraftData(flight.aircraftType);
  const mods: Record<string, number> = {};

  // Attack column = bomb points allocated (for regular bombs)
  // PGMs use their own columns
  const isPGM = profile === 'lgbLevel' || profile === 'lgbToss' ||
    profile === 'eogm' || profile === 'eogb' || profile === 'arm';
  const attackColumn = isPGM ? 0 : bombPointsAllocated;

  // Profile modifier
  mods['profile'] = profileInfo.modifier;

  // Target profile modifier
  mods['target_profile'] = TARGET_PROFILE_MODIFIER[targetProfile];

  // Bombsight modifier
  if (aircraft) mods['bombsight'] = aircraft.bombsightModifier;

  // AAA modifier (from barrage during bomb run)
  if (aaaModifier !== 0) mods['aaa'] = aaaModifier;

  // SAM modifier
  if (samModifier !== 0) mods['sam'] = samModifier;

  const roll = roll2d10();
  const totalMod = Object.values(mods).reduce((sum, v) => sum + v, 0);
  const finalRoll = roll + totalMod;

  // Air-to-Ground Attack Table (simplified)
  // Higher columns = more bomb points = better chance
  let attackSuccess = 0;
  if (isPGM) {
    // PGM columns
    if (finalRoll >= 16) attackSuccess = 3;
    else if (finalRoll >= 12) attackSuccess = 2;
    else if (finalRoll >= 8) attackSuccess = 1;
  } else {
    // Bomb columns - higher bomb points shift the table
    const columnBonus = Math.min(attackColumn, 12); // Cap at 12
    const effective = finalRoll + Math.floor(columnBonus / 2);
    if (effective >= 18) attackSuccess = 3;
    else if (effective >= 14) attackSuccess = 2;
    else if (effective >= 10) attackSuccess = 1;
  }

  return {
    attackerId: flight.id, targetId: target.id,
    profile, attackColumn, roll, modifiers: mods,
    finalRoll, attackSuccess, isPGM,
  };
}

// ── Ground Target Damage (18.0) ──────────────────────────────────

export type GroundDamageResult = 'noEffect' | 'slight' | 'heavy' | 'totalDestruction';

export interface DamageResolutionResult {
  targetId: string;
  attackSuccess: number;
  roll: number;
  result: GroundDamageResult;
}

/**
 * Resolve ground target damage.
 * Rule 18.2: Roll 2d10 on Damage Table by attack success value.
 */
export function resolveGroundDamage(
  targetId: string,
  attackSuccess: number
): DamageResolutionResult {
  if (attackSuccess <= 0) {
    return { targetId, attackSuccess, roll: 0, result: 'noEffect' };
  }

  const roll = roll2d10();

  // Damage Table (simplified, varies by attack success column)
  let result: GroundDamageResult = 'noEffect';

  if (attackSuccess >= 3) {
    if (roll >= 14) result = 'totalDestruction';
    else if (roll >= 8) result = 'heavy';
    else if (roll >= 4) result = 'slight';
  } else if (attackSuccess === 2) {
    if (roll >= 16) result = 'totalDestruction';
    else if (roll >= 10) result = 'heavy';
    else if (roll >= 6) result = 'slight';
  } else {
    if (roll >= 18) result = 'totalDestruction';
    else if (roll >= 13) result = 'heavy';
    else if (roll >= 8) result = 'slight';
  }

  return { targetId, attackSuccess, roll, result };
}

/**
 * Apply ground damage to a unit.
 * Rule 18.2: Damage effects vary by unit type.
 */
export function applyGroundDamage(
  unit: GroundUnitState,
  damageResult: GroundDamageResult
): GroundUnitState {
  if (damageResult === 'noEffect') return unit;

  const updated = { ...unit };

  switch (damageResult) {
    case 'slight':
      if (unit.type === 'sam' || unit.type === 'ewr' || unit.type === 'radarAAA') {
        // Suppressed for 1d10 turns
        updated.radarSuppressedTurns = roll1d10();
        updated.radarOn = false;
      } else if (unit.type === 'aaaConcentation') {
        updated.aaaSuppression = Math.min(3, updated.aaaSuppression + 1);
      }
      updated.damage = updated.damage === 'none' ? 'slight' : updated.damage;
      break;

    case 'heavy':
      if (unit.type === 'sam' || unit.type === 'ewr' || unit.type === 'radarAAA') {
        updated.radarOn = false;
        updated.radarShutdown = true;
      } else if (unit.type === 'aaaConcentation') {
        updated.aaaSuppression = Math.min(3, updated.aaaSuppression + 2);
      }
      updated.damage = 'heavy';
      break;

    case 'totalDestruction':
      updated.damage = 'destroyed';
      updated.radarOn = false;
      updated.active = false;
      break;
  }

  return updated;
}

// ── Ordnance Jettison (16.21) ────────────────────────────────────

/**
 * Roll for ordnance jettison on a flight.
 * Rule 16.21: Roll 1d10 per aircraft. 1-6 = jettison all ordnance.
 */
export function rollJettisonCheck(flight: FlightState): {
  aircraftIndex: number;
  roll: number;
  jettisoned: boolean;
}[] {
  return flight.aircraft.map((ac) => {
    if (ac.bombStrengthRemaining <= 0 && ac.ordnance.every((o) => o.shotsRemaining <= 0)) {
      return { aircraftIndex: ac.index, roll: 0, jettisoned: false };
    }
    const roll = roll1d10();
    return { aircraftIndex: ac.index, roll, jettisoned: roll <= 6 };
  });
}

// ── Laden/Clean Helpers ──────────────────────────────────────────

/**
 * Get total remaining bomb points for a flight.
 */
export function getTotalBombPoints(flight: FlightState): number {
  return flight.aircraft.reduce((sum, a) => sum + a.bombStrengthRemaining, 0);
}

/**
 * Get total remaining PGM shots by type.
 */
export function getPGMShots(flight: FlightState, type: string): number {
  return flight.aircraft.reduce((sum, a) =>
    sum + a.ordnance.filter((o) => o.type === type).reduce((s, o) => s + o.shotsRemaining, 0),
  0);
}

// ── ARM Attack (17.5) ────────────────────────────────────────────

export interface ARMAttackResult {
  attackerId: string;
  targetId: string;
  armType: string;
  roll: number;
  modifiers: Record<string, number>;
  finalRoll: number;
  attackSuccess: number;
  radarShutdown: boolean;
  shutdownVoluntary: boolean;
}

/**
 * Resolve an ARM (Anti-Radiation Missile) attack.
 * Rule 17.5: Special procedures for ARM launches.
 */
export function resolveARMAttack(
  flight: FlightState,
  target: GroundUnitState,
  armType: string,
  targetShutdown: boolean
): ARMAttackResult {
  const mods: Record<string, number> = {};

  // Shutdown modifier (17.53)
  if (targetShutdown) mods['shutdown'] = -4;

  // Range modifier
  const dist = hexDistance(flight.hex, target.hex);
  if (dist >= 10) mods['long_range'] = -2;
  else if (dist <= 2) mods['close_range'] = 2;

  const roll = roll2d10();
  const totalMod = Object.values(mods).reduce((sum, v) => sum + v, 0);
  const finalRoll = roll + totalMod;

  // ARM attack column
  let attackSuccess = 0;
  if (finalRoll >= 14) attackSuccess = 2;
  else if (finalRoll >= 8) attackSuccess = 1;

  return {
    attackerId: flight.id, targetId: target.id, armType,
    roll, modifiers: mods, finalRoll, attackSuccess,
    radarShutdown: targetShutdown, shutdownVoluntary: false,
  };
}

// ── Raid Planning Helpers (8.0) ──────────────────────────────────

/**
 * Check if a flight's task permits air-to-ground attacks.
 * Rule 8.2: Task table determines what ground targets can be attacked.
 */
export function canAttackGroundTargets(flight: FlightState): boolean {
  switch (flight.task) {
    case 'bombing': case 'sead': case 'rescueSupport':
      return true;
    default:
      return false;
  }
}

/**
 * Check if a flight can attack a specific target type based on its task.
 * Rule 17.11
 */
export function canAttackTarget(
  flight: FlightState,
  targetType: string,
  isInRaidTargetHex: boolean,
  distFromRaidTarget: number
): boolean {
  if (flight.task === 'bombing') {
    if (isInRaidTargetHex) return true;
    // Can attack AAA/SAM within 2 hexes of raid target
    if (distFromRaidTarget <= 2) {
      return ['aaaConcentation', 'radarAAA', 'mobileAAA', 'sam'].includes(targetType);
    }
    return false;
  }

  if (flight.task === 'sead' || flight.task === 'rescueSupport') {
    return ['aaaConcentation', 'radarAAA', 'mobileAAA', 'sam', 'ewr'].includes(targetType);
  }

  return false;
}
