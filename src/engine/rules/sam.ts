/**
 * SAM (Surface-to-Air Missile) rules.
 *
 * Reference: Rules section 15.0
 *
 * SAM sequence:
 * 1. SAM Acquisition Phase: Acquire targets on radar
 * 2. Movement Phase: Fire at acquired targets
 * 3. SAM Location Phase: Attempt to locate unlocated SAMs
 *
 * Key concepts:
 * - SAMs must acquire before firing (except IR SAMs, LOAL)
 * - Two acquisition levels: Partial and Full
 * - Terrain masking at Deck removes acquisition
 * - Max 2 SAM attacks per flight per turn (IR SAMs exempt)
 */

import {
  FlightState, GroundUnitState, GameState, AltitudeBand,
  HexCoord, hexToId, DamageLevel, AcquisitionLevel,
} from '../state/GameState';
import { hexDistance, altitudeIndex, hasLineOfSight } from '../hex';
import { getSAMType, SAMType } from '../../data/sams/samDatabase';
import { getAircraftData } from '../../data/aircraft/aircraftDatabase';
import { roll1d10, roll2d10 } from './detection';

// ── SAM Acquisition (15.2) ───────────────────────────────────────

export interface AcquisitionResult {
  samId: string;
  targetId: string;
  roll: number;
  modifiers: Record<string, number>;
  needed: number;
  result: AcquisitionLevel;
  previousLevel: AcquisitionLevel;
}

/**
 * Check if a SAM can attempt acquisition on a target.
 * Rule 15.22
 */
export function canAttemptAcquisition(
  sam: GroundUnitState,
  target: FlightState,
  gameState: GameState
): { canAcquire: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const samType = getSAMType(sam.subType);

  if (!samType) { reasons.push('Unknown SAM type'); return { canAcquire: false, reasons }; }
  if (sam.damage === 'destroyed' || sam.damage === 'heavy') reasons.push('SAM damaged/destroyed');
  if (sam.radarSuppressedTurns > 0) reasons.push('Radar suppressed');
  if (sam.radarShutdown) reasons.push('Radar shutdown');
  if (samType.isIR) reasons.push('IR SAMs do not use acquisition');

  // Range check
  const dist = hexDistance(sam.hex, target.hex);
  if (dist > samType.acquisitionRange) reasons.push(`Out of acquisition range (${dist} > ${samType.acquisitionRange})`);

  // Altitude check
  if (target.altitude === 'deck' && !samType.canEngageDeck) reasons.push('Cannot engage targets at Deck');

  // High altitude range adjustment (15.42)
  let effectiveDist = dist;
  if (target.altitude === 'high') effectiveDist += 1;
  if (target.altitude === 'veryHigh') effectiveDist += 3;
  if (effectiveDist > samType.acquisitionRange) reasons.push('Out of range (altitude adjusted)');

  // Phased array arc check (15.45)
  if (samType.isPhasedArray && sam.phasedArrayArc !== null) {
    // Simplified arc check
  }

  // Terrain masking (15.25)
  if (target.altitude === 'deck') {
    const hexData = gameState.hexes[hexToId(target.hex)];
    if (hexData?.terrain.includes('rough') || hexData?.terrain.includes('mountain')) {
      reasons.push('Terrain masking at Deck');
    }
  }

  // Radar must be on (or quick acquisition)
  if (!sam.radarOn) reasons.push('Radar is off');

  return { canAcquire: reasons.length === 0, reasons };
}

/**
 * Resolve a SAM acquisition attempt.
 * Rule 15.23: Roll 2d10 on SAM Acquisition Table.
 */
export function resolveAcquisition(
  sam: GroundUnitState,
  target: FlightState,
  gameState: GameState,
  isQuickAcq: boolean = false
): AcquisitionResult {
  const samType = getSAMType(sam.subType);
  const previousLevel = (sam.acquisitions[target.id] ?? 'none') as AcquisitionLevel;
  const mods: Record<string, number> = {};

  // Column determination: detected, undetected, or acquired
  let baseNeeded: number;
  if (previousLevel !== 'none') {
    baseNeeded = 6; // Acquired column (easiest to maintain)
  } else if (target.detected) {
    baseNeeded = 10; // Detected column
  } else {
    baseNeeded = 14; // Undetected column
  }

  // Range modifier
  const dist = hexDistance(sam.hex, target.hex);
  let effectiveDist = dist;
  if (target.altitude === 'high') effectiveDist += 1;
  if (target.altitude === 'veryHigh') effectiveDist += 3;
  if (effectiveDist > 10) mods['long_range'] = -2;

  // Target altitude
  if (target.altitude === 'deck') mods['deck'] = -3;
  else if (target.altitude === 'low') mods['low'] = -1;
  else if (target.altitude === 'high') mods['high'] = 1;
  else if (target.altitude === 'veryHigh') mods['very_high'] = 2;

  // Terrain
  const hexData = gameState.hexes[hexToId(target.hex)];
  if (target.altitude === 'deck' && hexData?.terrain.includes('rough')) mods['rough'] = -2;

  // Quick acquisition penalty
  if (isQuickAcq) mods['quick_acq'] = -3;

  // Anti-radar tactics
  if (target.markers.includes('antiRadarTactics')) mods['anti_radar'] = -3;

  // Defensive jamming
  const aircraft = getAircraftData(target.aircraftType);
  if (aircraft && aircraft.defensiveJamStrength > 0) {
    if (!target.markers.includes('maneuver')) {
      // Burn-through check for noise jammers (19.22)
      const burnThrough = aircraft.defensiveJamType === 'noise' &&
        (effectiveDist <= 2 || (aircraft.isLargeAircraft && effectiveDist <= 4));
      if (!burnThrough) {
        mods['defensive_jam'] = -aircraft.defensiveJamStrength;
      }
    }
  }

  const totalMod = Object.values(mods).reduce((sum, v) => sum + v, 0);
  const roll = roll2d10();
  const needed = baseNeeded - totalMod;

  // Determine result
  let result: AcquisitionLevel = 'none';
  if (roll >= needed + 4) {
    result = 'full';
  } else if (roll >= needed) {
    result = 'partial';
  }

  return {
    samId: sam.id, targetId: target.id, roll, modifiers: mods,
    needed, result, previousLevel,
  };
}

// ── SAM Attack (15.3) ────────────────────────────────────────────

export interface SAMAttackResult {
  samId: string;
  targetId: string;
  attackRoll: number;
  attackModifiers: Record<string, number>;
  attackResult: 'possibleHit' | 'miss';
  defenseRoll: number | null;
  defenseModifiers: Record<string, number>;
  defenseResult: 'rollDamage' | 'samAvoidance' | 'miss' | null;
  damageRoll: number | null;
  damageResult: DamageLevel | null;
  salvoFired: boolean;
  ammoUsed: number;
}

/**
 * Check if a SAM can fire at a target.
 * Rule 15.31
 */
export function canSAMFire(
  sam: GroundUnitState,
  target: FlightState,
  gameState: GameState,
  samAttacksThisTurn: number
): { canFire: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const samType = getSAMType(sam.subType);

  if (!samType) { reasons.push('Unknown SAM type'); return { canFire: false, reasons }; }
  if (sam.ammoRemaining <= 0) reasons.push('No ammo remaining');
  if (sam.damage === 'destroyed' || sam.damage === 'heavy') reasons.push('SAM damaged/destroyed');
  if (sam.radarSuppressedTurns > 0) reasons.push('Radar suppressed');

  // Must have acquisition (except IR SAMs, LOAL)
  if (!samType.isIR && !samType.hasLOAL) {
    const acqLevel = sam.acquisitions[target.id];
    if (!acqLevel || acqLevel === 'none') reasons.push('No acquisition on target');
  }

  // Range check
  const dist = hexDistance(sam.hex, target.hex);
  let effectiveDist = dist;
  if (target.altitude === 'high') effectiveDist += 1;
  if (target.altitude === 'veryHigh') effectiveDist += 3;
  if (effectiveDist > samType.attackRange) reasons.push('Out of attack range');
  if (dist < samType.minRange) reasons.push('Inside minimum range');

  // Max 2 SAM attacks per flight per turn (IR SAMs exempt)
  if (!samType.isIR && samAttacksThisTurn >= 2) reasons.push('Max 2 SAM attacks this turn');

  // Deconfliction: no friendly flight within 4 hexes (15.31)
  const friendlyFlights = Object.values(gameState.flights).filter(
    (f) => f.side === sam.side && hexDistance(f.hex, target.hex) <= 4
  );
  if (friendlyFlights.length > 0 && !samType.isIR) {
    reasons.push('Friendly flight within 4 hexes (deconfliction)');
  }

  return { canFire: reasons.length === 0, reasons };
}

/**
 * Resolve a SAM attack.
 * Rule 15.32: Roll on SAM Attack Table, then SAM Defense Table.
 */
export function resolveSAMAttack(
  sam: GroundUnitState,
  target: FlightState,
  gameState: GameState,
  useSalvo: boolean = false
): SAMAttackResult {
  const samType = getSAMType(sam.subType);
  const atkMods: Record<string, number> = {};
  const defMods: Record<string, number> = {};

  // Attack modifiers
  const dist = hexDistance(sam.hex, target.hex);
  let effectiveDist = dist;
  if (target.altitude === 'high') effectiveDist += 1;
  if (target.altitude === 'veryHigh') effectiveDist += 3;

  if (effectiveDist <= 2) atkMods['close_range'] = 2;
  else if (effectiveDist >= 10) atkMods['long_range'] = -2;

  if (useSalvo) atkMods['salvo'] = 2;

  // Acquisition level
  const acqLevel = sam.acquisitions[target.id] as AcquisitionLevel;
  if (acqLevel === 'partial') atkMods['partial_acq'] = -2;

  // Target altitude
  if (target.altitude === 'deck') atkMods['deck'] = -2;

  const atkRoll = roll2d10();
  const atkTotalMod = Object.values(atkMods).reduce((sum, v) => sum + v, 0);
  const attackResult: 'possibleHit' | 'miss' = (atkRoll + atkTotalMod) >= 8 ? 'possibleHit' : 'miss';

  const ammoUsed = useSalvo ? 2 : 1;

  if (attackResult === 'miss') {
    return {
      samId: sam.id, targetId: target.id,
      attackRoll: atkRoll, attackModifiers: atkMods, attackResult: 'miss',
      defenseRoll: null, defenseModifiers: defMods, defenseResult: null,
      damageRoll: null, damageResult: null, salvoFired: useSalvo, ammoUsed,
    };
  }

  // SAM Defense Table
  // Defensive jamming
  const aircraft = getAircraftData(target.aircraftType);
  if (aircraft && aircraft.defensiveJamStrength > 0 && !target.markers.includes('maneuver')) {
    defMods['defensive_jam'] = aircraft.defensiveJamStrength;
  }

  // Anti-radar tactics
  if (target.markers.includes('antiRadarTactics')) defMods['anti_radar'] = 3;

  // Poor SAM defense
  if (aircraft?.poorSAMDefense) defMods['poor_defense'] = -3;

  const defRoll = roll2d10();
  const defTotalMod = Object.values(defMods).reduce((sum, v) => sum + v, 0);
  const defFinal = defRoll + defTotalMod;

  let defenseResult: 'rollDamage' | 'samAvoidance' | 'miss';
  if (defFinal <= 6) {
    defenseResult = 'rollDamage';
  } else if (defFinal <= 12) {
    defenseResult = aircraft?.poorSAMDefense ? 'rollDamage' : 'samAvoidance';
  } else {
    defenseResult = 'miss';
  }

  // Damage
  let damageRoll: number | null = null;
  let damageResult: DamageLevel | null = null;

  if (defenseResult === 'rollDamage') {
    damageRoll = roll1d10();
    if (acqLevel === 'full') {
      // Full acquisition damage column
      if (damageRoll >= 8) damageResult = 'shotdown';
      else if (damageRoll >= 5) damageResult = 'crippled';
      else if (damageRoll >= 2) damageResult = 'damaged';
      else damageResult = 'none';
    } else {
      // Partial acquisition damage column
      if (damageRoll >= 9) damageResult = 'shotdown';
      else if (damageRoll >= 6) damageResult = 'crippled';
      else if (damageRoll >= 3) damageResult = 'damaged';
      else damageResult = 'none';
    }
  }

  return {
    samId: sam.id, targetId: target.id,
    attackRoll: atkRoll, attackModifiers: atkMods, attackResult,
    defenseRoll: defRoll, defenseModifiers: defMods, defenseResult,
    damageRoll, damageResult, salvoFired: useSalvo, ammoUsed,
  };
}

// ── SAM Location (15.13) ─────────────────────────────────────────

export interface SAMLocationResult {
  samId: string;
  flightId: string;
  roll: number;
  needed: number;
  located: boolean;
}

/**
 * Attempt to locate an unlocated SAM (marked with SAM Warning).
 * Rule 15.13: Roll 1d10, need 10+ to locate.
 */
export function attemptSAMLocation(
  sam: GroundUnitState,
  locatingFlight: FlightState
): SAMLocationResult {
  const dist = hexDistance(sam.hex, locatingFlight.hex);
  const aircraft = getAircraftData(locatingFlight.aircraftType);
  const rwrRange = aircraft?.rwrRating ?? 6;

  // Must be within RWR range and have LOS
  if (dist > rwrRange) {
    return { samId: sam.id, flightId: locatingFlight.id, roll: 0, needed: 99, located: false };
  }

  let modifier = 0;

  // SAM Launch marker increases range by 5 (check if SAM has launched)
  // Simplified: apply modifier if SAM has fired recently

  // Range modifier
  if (dist >= 8) modifier -= 2;
  else if (dist >= 5) modifier -= 1;

  const roll = roll1d10();
  const needed = 10 - modifier;
  const located = roll >= needed;

  return { samId: sam.id, flightId: locatingFlight.id, roll, needed, located };
}

// ── IR SAM Attack (15.44) ────────────────────────────────────────

/**
 * Resolve an IR SAM tracking attack.
 * Rule 15.44: No acquisition needed, LOS required.
 */
export function resolveIRSAMAttack(
  sam: GroundUnitState,
  target: FlightState,
  gameState: GameState
): SAMAttackResult {
  // IR SAMs use simplified attack - LOS required
  const getTerrain = (hex: HexCoord) => {
    const data = gameState.hexes[hexToId(hex)];
    return data?.terrain ?? ['land'];
  };

  const losOk = hasLineOfSight(sam.hex, target.hex, 'deck', target.altitude, getTerrain);
  if (!losOk) {
    return {
      samId: sam.id, targetId: target.id,
      attackRoll: 0, attackModifiers: {}, attackResult: 'miss',
      defenseRoll: null, defenseModifiers: {}, defenseResult: null,
      damageRoll: null, damageResult: null, salvoFired: false, ammoUsed: 1,
    };
  }

  // Resolve as normal SAM attack with some IR-specific mods
  return resolveSAMAttack(sam, target, gameState, false);
}

// ── SAM Acquisition Phase Runner ─────────────────────────────────

/**
 * Run the SAM Acquisition Phase for all SAMs on a side.
 */
export function runSAMAcquisitionPhase(
  gameState: GameState,
  side: 'nato' | 'wp'
): AcquisitionResult[] {
  const results: AcquisitionResult[] = [];
  const enemySide = side === 'nato' ? 'wp' : 'nato';

  for (const sam of Object.values(gameState.groundUnits)) {
    if (sam.side !== side) continue;
    if (sam.type !== 'sam') continue;
    if (sam.damage === 'destroyed' || sam.damage === 'heavy') continue;
    if (!sam.radarOn) continue;

    const samType = getSAMType(sam.subType);
    if (!samType || samType.isIR) continue; // IR SAMs don't acquire

    // Find eligible targets
    for (const target of Object.values(gameState.flights)) {
      if (target.side !== enemySide) continue;
      if (target.isOnGround) continue;

      const check = canAttemptAcquisition(sam, target, gameState);
      if (!check.canAcquire) continue;

      // Check if SAM already has max acquisitions
      const currentAcqs = Object.values(sam.acquisitions).filter((a) => a !== 'none').length;
      const maxAcqs = samType.isPhasedArray ? 2 : 1;
      if (currentAcqs >= maxAcqs && !sam.acquisitions[target.id]) continue;

      const result = resolveAcquisition(sam, target, gameState);
      results.push(result);

      // Only one acquisition attempt per SAM per phase (except phased array)
      if (!samType.isPhasedArray) break;
    }
  }

  return results;
}

/**
 * Apply acquisition results to game state.
 */
export function applyAcquisitionResults(
  gameState: GameState,
  results: AcquisitionResult[]
): GameState {
  const groundUnits = { ...gameState.groundUnits };

  for (const result of results) {
    const sam = groundUnits[result.samId];
    if (!sam) continue;

    groundUnits[result.samId] = {
      ...sam,
      acquisitions: {
        ...sam.acquisitions,
        [result.targetId]: result.result,
      },
    };
  }

  return { ...gameState, groundUnits };
}
