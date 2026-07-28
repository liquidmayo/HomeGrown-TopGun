/**
 * Air-to-Air Combat rules for Red Storm.
 *
 * Reference: Rules sections 11.0 - 13.0
 *
 * Two types of air-to-air combat:
 * 1. Standard (dogfight): close range, both sides roll
 * 2. BVR (beyond visual range): long range, only attacker rolls
 *
 * Combat sequence:
 * 1. Check prerequisites (11.21 / 11.212)
 * 2. Engagement rolls (11.22)
 * 3. Determine Surprise/Disadvantage (11.24)
 * 4. Maneuver rolls (11.31) → shot opportunities
 * 5. Shot resolution (11.33) → damage results
 * 6. Ammo depletion (11.34)
 * 7. Damage allocation (12.1)
 * 8. Post-combat: morale, scatter, markers (13.0)
 */

import { FlightState, GameState, HexCoord, DamageLevel, hexToId } from '../state/GameState';
import { hexDistance, isInForwardArc, isInForwardHemisphere, getArc, altitudeIndex, altitudeDifference, getNeighbor, normalizeHeading } from '../hex';
import { getAircraftData } from '../../data/aircraft/aircraftDatabase';
import { getWeapon, AirToAirWeapon } from '../../data/weapons/airToAirWeapons';
import { roll1d10, roll2d10 } from './detection';

// ── Engagement Prerequisites (11.21) ─────────────────────────────

export interface EngagementCheck {
  canEngage: boolean;
  reasons: string[];
}

/**
 * Check if a flight can attempt standard air-to-air engagement.
 * Rule 11.211
 */
export function checkStandardEngagementPrereqs(
  attacker: FlightState,
  defender: FlightState,
  gameState: GameState
): EngagementCheck {
  const reasons: string[] = [];

  if (!attacker.hasMoved) reasons.push('Attacker must have moved at least 1 hex or changed altitude');
  if (!defender.detected) reasons.push('Defender must be detected');
  if (attacker.disordered) reasons.push('Attacker is disordered');
  if (attacker.aborted) reasons.push('Attacker has aborted');
  if (attacker.markers.includes('samAvoid')) reasons.push('Attacker performed SAM avoidance');
  if (attacker.markers.includes('antiRadarTactics')) reasons.push('Attacker declared anti-radar tactics');

  const dist = hexDistance(attacker.hex, defender.hex);
  if (dist > 1) reasons.push('Defender must be within 1 hex');

  // Same altitude or one band below
  const altDiff = altitudeIndex(attacker.altitude) - altitudeIndex(defender.altitude);
  if (altDiff < 0 || altDiff > 1) reasons.push('Defender must be at same altitude or one band below');

  // Forward arc check (if different hexes) - Rule 11.211c
  if (dist > 0 && !isInForwardArc(attacker.hex, attacker.heading, defender.hex)) {
    // Also allow forward hemisphere (forward beam arcs count for adjacent hex)
    if (!isInForwardHemisphere(attacker.hex, attacker.heading, defender.hex)) {
      reasons.push('Defender must be in forward arc (if different hex)');
    }
  }

  // Must have undepleted weapon
  const hasWeapon = attacker.aircraft.some((a) =>
    a.damage === 'none' && a.airToAirWeapons.some((w) => !w.depleted)
  );
  if (!hasWeapon) reasons.push('No undepleted air-to-air weapons');

  // Task restriction (Rule 8.2)
  // Tasks with "Defend" only cannot initiate. "Attack and Defend" can.
  const defendOnlyTasks: string[] = [
    'bombing', 'sead', 'recon', 'escortJamming', 'standoffJamming',
    'csar', 'transport', 'laserDesignation', 'chaffLaying', 'fac',
  ];
  if (defendOnlyTasks.includes(attacker.task)) {
    reasons.push('Flight task only allows defensive combat');
  }

  return { canEngage: reasons.length === 0, reasons };
}

/**
 * Check BVR engagement prerequisites.
 * Rule 11.212
 */
export function checkBVREngagementPrereqs(
  attacker: FlightState,
  defender: FlightState,
  gameState: GameState
): EngagementCheck {
  const reasons: string[] = [];

  if (!attacker.hasMoved) reasons.push('Attacker must have moved at least 1 hex');
  if (!defender.detected) reasons.push('Defender must be detected');
  if (attacker.disordered) reasons.push('Attacker is disordered');
  if (attacker.aborted) reasons.push('Attacker has aborted');
  if (attacker.inDefensiveWheel) reasons.push('Cannot BVR from defensive wheel');

  if (!isInForwardArc(attacker.hex, attacker.heading, defender.hex)) {
    reasons.push('Defender must be in forward arc');
  }

  // Check BVR weapon range
  const bvrWeapon = getBestBVRWeapon(attacker, defender);
  if (!bvrWeapon) reasons.push('No BVR weapon in range');

  // Lookdown check
  const aircraft = getAircraftData(attacker.aircraftType);
  if (aircraft && altitudeIndex(defender.altitude) < altitudeIndex(attacker.altitude)) {
    if (aircraft.lookdown === 'No_LD') reasons.push('Lookdown prevents BVR engagement');
    if (aircraft.lookdown === 'LD_LTD' &&
        (defender.altitude === 'deck' || defender.altitude === 'low')) {
      reasons.push('Limited lookdown prevents BVR at Deck/Low');
    }
  }

  return { canEngage: reasons.length === 0, reasons };
}

// ── Engagement Rolls (11.22) ─────────────────────────────────────

export interface EngagementRollResult {
  roll: number;
  needed: number;
  modifiers: Record<string, number>;
  success: boolean;
}

export interface EngagementResult {
  attackerRoll: EngagementRollResult;
  defenderRoll: EngagementRollResult | null;  // null for BVR
  outcome: 'attackerSurprise' | 'mutual' | 'defenderInitiates' | 'noEngagement';
  combatOccurs: boolean;
  attackerHasSurprise: boolean;
  defenderDisadvantaged: boolean;
}

/**
 * Engagement values by situation. Rule 11.22
 */
function getEngagementValue(isDay: boolean, targetDetected: boolean, isBVR: boolean): number {
  if (isBVR) return 10;
  if (isDay) return targetDetected ? 8 : 12;
  return targetDetected ? 10 : 14;
}

/**
 * Roll for standard air-to-air engagement.
 */
export function rollStandardEngagement(
  attacker: FlightState,
  defender: FlightState,
  isDay: boolean
): EngagementResult {
  // Attacker roll
  const atkMods: Record<string, number> = {};
  atkMods['aggression'] = attacker.aggressionValue;
  if (attacker.altitude !== defender.altitude) atkMods['altitude_diff'] = -1;
  if (attacker.disordered) atkMods['disordered'] = -2;

  const atkNeeded = getEngagementValue(isDay, defender.detected, false);
  const atkTotalMod = Object.values(atkMods).reduce((sum, v) => sum + v, 0);
  const atkRoll = roll2d10();
  const atkSuccess = (atkRoll + atkTotalMod) >= atkNeeded;

  // Defender roll
  const defMods: Record<string, number> = {};
  defMods['aggression'] = defender.aggressionValue;
  if (attacker.altitude !== defender.altitude) defMods['altitude_diff'] = -1;
  if (defender.disordered) defMods['disordered'] = -2;

  // Rear hemisphere penalty for defender
  const arc = getArc(defender.hex, defender.heading, attacker.hex);
  if (arc === 'rear' || arc === 'rearBeamRight' || arc === 'rearBeamLeft') {
    defMods['rear_hemisphere'] = -2;
  }

  const defNeeded = getEngagementValue(isDay, attacker.detected, false);
  const defTotalMod = Object.values(defMods).reduce((sum, v) => sum + v, 0);
  const defRoll = roll2d10();
  const defSuccess = (defRoll + defTotalMod) >= defNeeded;

  // Determine outcome (Rule 11.24)
  let outcome: EngagementResult['outcome'];
  let combatOccurs = false;
  let surprise = false;
  let disadvantaged = false;

  if (atkSuccess && !defSuccess) {
    outcome = 'attackerSurprise';
    combatOccurs = true;
    surprise = true;
    disadvantaged = true;
  } else if (atkSuccess && defSuccess) {
    outcome = 'mutual';
    combatOccurs = true;
  } else if (!atkSuccess && defSuccess) {
    outcome = 'defenderInitiates';
    // Defender can choose to start combat (if able)
    combatOccurs = !defender.disordered && !defender.aborted &&
      defender.aircraft.some((a) => a.airToAirWeapons.some((w) => !w.depleted));
  } else {
    outcome = 'noEngagement';
  }

  return {
    attackerRoll: { roll: atkRoll, needed: atkNeeded, modifiers: atkMods, success: atkSuccess },
    defenderRoll: { roll: defRoll, needed: defNeeded, modifiers: defMods, success: defSuccess },
    outcome,
    combatOccurs,
    attackerHasSurprise: surprise,
    defenderDisadvantaged: disadvantaged,
  };
}

/**
 * Roll for BVR engagement.
 */
export function rollBVREngagement(
  attacker: FlightState,
  defender: FlightState
): EngagementResult {
  const aircraft = getAircraftData(attacker.aircraftType);

  // F-15 flights automatically succeed BVR engagement (11.44)
  if (aircraft && (aircraft.id === 'F-15C' || aircraft.id === 'F-15A')) {
    return {
      attackerRoll: { roll: 20, needed: 0, modifiers: { f15_auto: 0 }, success: true },
      defenderRoll: null,
      outcome: 'mutual', // No surprise in BVR
      combatOccurs: true,
      attackerHasSurprise: false,
      defenderDisadvantaged: false,
    };
  }

  const mods: Record<string, number> = {};
  mods['aggression'] = attacker.aggressionValue;
  if (attacker.altitude !== defender.altitude) mods['altitude_diff'] = -1;

  const needed = getEngagementValue(true, true, true);
  const totalMod = Object.values(mods).reduce((sum, v) => sum + v, 0);
  const roll = roll2d10();
  const success = (roll + totalMod) >= needed;

  return {
    attackerRoll: { roll, needed, modifiers: mods, success },
    defenderRoll: null,
    outcome: success ? 'mutual' : 'noEngagement',
    combatOccurs: success,
    attackerHasSurprise: false,
    defenderDisadvantaged: false,
  };
}

// ── Maneuver (11.31) ─────────────────────────────────────────────

export interface ManeuverResult {
  flightId: string;
  roll: number;
  modifiers: Record<string, number>;
  maneuverRating: number;
  finalRoll: number;
  shotOpportunities: number;
}

/**
 * Maneuver Table lookup. Returns shot opportunities.
 * Rule 11.31: Roll 2d10, cross-reference with aircraft column.
 */
function lookupManeuverTable(finalRoll: number, aircraftCount: number): number {
  // Simplified maneuver table (full table has specific values per column)
  // Column is based on number of undamaged aircraft (1-4)
  const col = Math.min(aircraftCount, 4);

  if (finalRoll <= 2) return 0;
  if (finalRoll <= 5) return col >= 2 ? 1 : 0;
  if (finalRoll <= 9) return col >= 3 ? 2 : 1;
  if (finalRoll <= 13) return col >= 2 ? 2 : 1;
  if (finalRoll <= 17) return col >= 3 ? 3 : 2;
  return col >= 2 ? 3 : 2; // 18+
}

/**
 * Roll for maneuver in standard combat.
 */
export function rollManeuver(
  flight: FlightState,
  isAttacker: boolean,
  hasSurprise: boolean,
  isDisadvantaged: boolean,
  isBVR: boolean
): ManeuverResult {
  const aircraft = getAircraftData(flight.aircraftType);
  const mods: Record<string, number> = {};

  // Base maneuver rating
  let maneuverRating = 4; // Default
  if (aircraft) {
    const altIdx = flight.altitude === 'deck' ? 0 :
      flight.altitude === 'low' ? 0 :
      flight.altitude === 'medium' ? 1 :
      flight.altitude === 'high' ? 2 : 3;

    const isLaden = flight.aircraft.some((a) => a.bombStrengthRemaining > 0);
    const ratings = isLaden ? aircraft.maneuverLaden : aircraft.maneuverClean;
    maneuverRating = ratings[altIdx] ?? 4;
  }

  mods['maneuver_rating'] = maneuverRating;

  // Surprise/Disadvantage modifiers
  if (hasSurprise) mods['surprise'] = 3;
  if (isDisadvantaged) mods['disadvantaged'] = -3;

  // Climbing modifier (11.42)
  if (flight.markers.includes('zoomClimb')) mods['zoom_climb'] = -2;

  // Disordered modifier
  if (flight.disordered) mods['disordered'] = -2;

  // Soviet doctrine (11.32): WP flights use 1 column for 1-2 ship
  const undamagedCount = flight.aircraft.filter((a) => a.damage === 'none').length;
  let effectiveCount = undamagedCount;

  // Soviet doctrine
  if (flight.side === 'wp' && isAttacker &&
      aircraft?.id !== 'MiG-29A' && aircraft?.id !== 'Su-27') {
    if (undamagedCount <= 2) effectiveCount = 1;
    else effectiveCount = 2;
  }

  // Disordered or defensive wheel: use 1 column
  if (flight.disordered || flight.inDefensiveWheel) effectiveCount = 1;

  const roll = roll2d10();
  const totalMod = Object.values(mods).reduce((sum, v) => sum + v, 0);
  const finalRoll = roll + totalMod;

  const shotOpportunities = isBVR
    ? lookupBVRManeuverTable(finalRoll, effectiveCount)
    : lookupManeuverTable(finalRoll, effectiveCount);

  return {
    flightId: flight.id,
    roll,
    modifiers: mods,
    maneuverRating,
    finalRoll,
    shotOpportunities,
  };
}

/** BVR maneuver table (simpler, attacker only). */
function lookupBVRManeuverTable(finalRoll: number, aircraftCount: number): number {
  const col = Math.min(aircraftCount, 4);
  if (finalRoll <= 4) return 0;
  if (finalRoll <= 8) return 1;
  if (finalRoll <= 14) return col >= 2 ? 2 : 1;
  return col >= 3 ? 3 : 2;
}

// ── Shot Resolution (11.33) ──────────────────────────────────────

export interface ShotResult {
  weaponId: string;
  roll: number;
  modifiers: Record<string, number>;
  finalRoll: number;
  hit: boolean;
  damageType: DamageLevel | null; // null if miss
}

/**
 * Shot resolution table lookup.
 * Rule 11.33: Roll 2d10 + weapon combat value + modifiers.
 */
export function resolveShot(
  weapon: AirToAirWeapon,
  hasAdditionalWeapons: boolean,
  isBVR: boolean
): ShotResult {
  const mods: Record<string, number> = {};
  const combatValue = isBVR ? (weapon.bvrCombatValue ?? 0) : weapon.standardCombatValue;
  mods['weapon_value'] = combatValue;

  // Additional weapons modifier (not for BVR)
  if (hasAdditionalWeapons && !isBVR) mods['additional_weapons'] = 1;

  const roll = roll2d10();
  const totalMod = Object.values(mods).reduce((sum, v) => sum + v, 0);
  const finalRoll = roll + totalMod;

  // Shot resolution table (simplified)
  let hit = false;
  let damageType: DamageLevel | null = null;

  if (finalRoll >= 18) { damageType = 'shotdown'; hit = true; }
  else if (finalRoll >= 15) { damageType = 'crippled'; hit = true; }
  else if (finalRoll >= 12) { damageType = 'damaged'; hit = true; }
  else { hit = false; }

  return {
    weaponId: weapon.id,
    roll,
    modifiers: mods,
    finalRoll,
    hit,
    damageType,
  };
}

// ── Ammo Depletion (11.34) ───────────────────────────────────────

export interface DepletionResult {
  weaponId: string;
  roll: number;
  depleted: boolean;
  secondaryDepleted: boolean;
  secondaryWeaponId: string | null;
}

/**
 * Roll for ammo depletion after combat.
 * Rule 11.34: Roll 1d10 per flight that took shots. <= depletion number = depleted.
 * If roll is 1 or less (after shot count modifier), second weapon also depleted.
 */
export function rollDepletion(
  weapon: AirToAirWeapon,
  shotsTaken: number,
  secondaryWeaponId: string | null,
  isBVR: boolean
): DepletionResult {
  const roll = roll1d10();
  const modified = roll - (shotsTaken - 1); // -1 per shot after first

  const depleted = modified <= weapon.depletionNumber;
  let secondaryDepleted = false;

  // If modified roll is 1 or less, second weapon also depleted (not for BVR)
  if (!isBVR && modified <= 1 && secondaryWeaponId) {
    secondaryDepleted = true;
  }

  return {
    weaponId: weapon.id,
    roll,
    depleted,
    secondaryDepleted,
    secondaryWeaponId: secondaryDepleted ? secondaryWeaponId : null,
  };
}

// ── Damage Allocation (12.1) ─────────────────────────────────────

export interface DamageAllocationResult {
  aircraftIndex: number;
  damageApplied: DamageLevel;
  previousDamage: DamageLevel;
  resultingDamage: DamageLevel;
}

/**
 * Allocate damage to a specific aircraft in the flight.
 * Rule 12.1: Roll on Damage Allocation Table by flight size.
 */
export function allocateDamage(
  flight: FlightState,
  damageType: DamageLevel
): DamageAllocationResult {
  const aliveAircraft = flight.aircraft.filter((a) => a.damage !== 'shotdown');
  if (aliveAircraft.length === 0) {
    return { aircraftIndex: 0, damageApplied: damageType, previousDamage: 'shotdown', resultingDamage: 'shotdown' };
  }

  // Roll for which aircraft is hit
  const roll = roll1d10();
  let targetIdx: number;

  // Damage allocation table (simplified)
  if (aliveAircraft.length === 1) {
    targetIdx = 0;
  } else if (aliveAircraft.length === 2) {
    targetIdx = roll <= 5 ? 0 : 1;
  } else if (aliveAircraft.length === 3) {
    targetIdx = roll <= 3 ? 0 : roll <= 7 ? 1 : 2;
  } else {
    targetIdx = roll <= 3 ? 0 : roll <= 5 ? 1 : roll <= 8 ? 2 : 3;
  }

  const targetAc = aliveAircraft[Math.min(targetIdx, aliveAircraft.length - 1)];
  const previousDamage = targetAc.damage;

  // Apply damage escalation
  let resultingDamage: DamageLevel = damageType;
  if (previousDamage === 'damaged') {
    if (damageType === 'damaged') resultingDamage = 'crippled';
    else resultingDamage = damageType; // crippled or shotdown stays
  } else if (previousDamage === 'crippled') {
    resultingDamage = 'shotdown'; // Any further damage = shotdown
  }

  return {
    aircraftIndex: targetAc.index,
    damageApplied: damageType,
    previousDamage,
    resultingDamage,
  };
}

// ── Morale Check (13.1) ─────────────────────────────────────────

export type MoraleResult = 'none' | 'jettison' | 'disordered' | 'abort';

export interface MoraleCheckResult {
  flightId: string;
  roll: number;
  modifiers: Record<string, number>;
  finalRoll: number;
  result: MoraleResult;
  aggressionChange: number;
}

/**
 * Conduct a morale check after combat.
 * Rule 13.1: Roll 2d10 on Morale Check Table.
 */
export function rollMoraleCheck(
  flight: FlightState,
  combatType: 'standard' | 'bvr' | 'aaa_sam',
  aircraftLostThisCombat: number,
  aircraftDamagedThisCombat: number
): MoraleCheckResult {
  const mods: Record<string, number> = {};

  mods['aggression'] = flight.aggressionValue;
  if (aircraftLostThisCombat > 0) mods['aircraft_lost'] = -3 * aircraftLostThisCombat;
  if (aircraftDamagedThisCombat > 0) mods['aircraft_damaged'] = -1 * aircraftDamagedThisCombat;
  if (flight.disordered) mods['already_disordered'] = -2;

  const roll = roll2d10();
  const totalMod = Object.values(mods).reduce((sum, v) => sum + v, 0);
  const finalRoll = roll + totalMod;

  let result: MoraleResult = 'none';
  let aggressionChange = 0;

  // Morale table results vary by combat type
  const threshold = combatType === 'standard' ? 8 : combatType === 'bvr' ? 10 : 8;

  if (finalRoll <= threshold - 8) {
    result = 'abort';
    aggressionChange = -2;
  } else if (finalRoll <= threshold - 4) {
    result = 'disordered';
    aggressionChange = -1;
  } else if (finalRoll <= threshold) {
    result = 'jettison';
    aggressionChange = -1;
  } else {
    result = 'none';
  }

  return {
    flightId: flight.id,
    roll,
    modifiers: mods,
    finalRoll,
    result,
    aggressionChange,
  };
}

// ── Scatter (13.2) ───────────────────────────────────────────────

export interface ScatterResult {
  flightId: string;
  roll: number;
  newHex: HexCoord;
  altitudeChange: number; // -1 = descend, 0 = none
  headingChange: number;
}

/**
 * Resolve scatter after standard combat.
 * Rule 13.2: Roll die, scatter relative to flight heading.
 * Low rolls = forward/beam scatter. High rolls = rear scatter with descent.
 */
export function rollScatter(flight: FlightState): ScatterResult {
  const roll = roll1d10();

  const headingDirMap: Record<number, number> = { 0:0, 60:5, 120:4, 180:3, 240:2, 300:1 };
  const baseDir = headingDirMap[normalizeHeading(flight.heading)] ?? 0;

  let scatterOffset: number;
  let descend = false;
  let headingChange = 0;

  if (roll <= 2) {
    scatterOffset = roll === 1 ? 5 : 1; // Forward-beam left/right
    headingChange = roll === 1 ? -60 : 60;
  } else if (roll <= 4) {
    scatterOffset = roll === 3 ? 4 : 2; // Beam left/right
    headingChange = roll === 3 ? -30 : 30;
  } else if (roll <= 6) {
    scatterOffset = 0; // Forward scatter
    headingChange = roll === 5 ? -30 : 30;
  } else if (roll <= 8) {
    scatterOffset = 3; // Rear scatter with descent
    headingChange = roll === 7 ? -90 : 90;
    descend = true;
  } else {
    scatterOffset = roll === 9 ? 4 : 2; // Rear-beam with descent
    headingChange = roll === 9 ? -120 : 120;
    descend = true;
  }

  const scatterDir = ((baseDir + scatterOffset) % 6) as 0|1|2|3|4|5;
  const candidate = getNeighbor(flight.hex, scatterDir);
  const newHex = (candidate.col >= 0 && candidate.col <= 79 && candidate.row >= 0 && candidate.row <= 50)
    ? candidate : flight.hex;

  return {
    flightId: flight.id, roll, newHex,
    altitudeChange: descend ? -1 : 0,
    headingChange,
  };
}

// ── Helper: Find best BVR weapon ─────────────────────────────────

function getBestBVRWeapon(
  attacker: FlightState,
  defender: FlightState
): AirToAirWeapon | null {
  const dist = hexDistance(attacker.hex, defender.hex);
  const arc = getArc(defender.hex, defender.heading, attacker.hex);

  // Determine which range to use based on arc
  let rangeType: 'forward' | 'beam' | 'rear' = 'forward';
  if (arc === 'forward') rangeType = 'forward';
  else if (arc === 'rear') rangeType = 'rear';
  else rangeType = 'beam';

  let bestWeapon: AirToAirWeapon | null = null;
  let bestValue = -1;

  for (const ac of attacker.aircraft) {
    if (ac.damage !== 'none') continue;
    for (const ws of ac.airToAirWeapons) {
      if (ws.depleted) continue;
      const weapon = getWeapon(ws.weaponId);
      if (!weapon?.bvrRange) continue;

      const maxRange = weapon.bvrRange[rangeType];
      if (dist <= maxRange && (weapon.bvrCombatValue ?? 0) > bestValue) {
        bestWeapon = weapon;
        bestValue = weapon.bvrCombatValue ?? 0;
      }
    }
  }

  return bestWeapon;
}

// ── Full Combat Resolution ───────────────────────────────────────

export interface CombatResolution {
  type: 'standard' | 'bvr';
  engagement: EngagementResult;
  attackerManeuver: ManeuverResult | null;
  defenderManeuver: ManeuverResult | null;
  attackerShots: ShotResult[];
  defenderShots: ShotResult[];
  attackerDepletion: DepletionResult | null;
  defenderDepletion: DepletionResult | null;
  damageAllocations: DamageAllocationResult[];
  attackerMorale: MoraleCheckResult | null;
  defenderMorale: MoraleCheckResult | null;
  attackerScatter: ScatterResult | null;
  defenderScatter: ScatterResult | null;
}

/**
 * Resolve a complete standard air-to-air combat.
 */
export function resolveStandardCombat(
  attacker: FlightState,
  defender: FlightState,
  isDay: boolean
): CombatResolution {
  // 1. Engagement
  const engagement = rollStandardEngagement(attacker, defender, isDay);

  if (!engagement.combatOccurs) {
    return {
      type: 'standard', engagement,
      attackerManeuver: null, defenderManeuver: null,
      attackerShots: [], defenderShots: [],
      attackerDepletion: null, defenderDepletion: null,
      damageAllocations: [],
      attackerMorale: null, defenderMorale: null,
      attackerScatter: null, defenderScatter: null,
    };
  }

  // 2. Maneuver rolls
  const atkManeuver = rollManeuver(
    attacker, true, engagement.attackerHasSurprise, false, false
  );
  const defManeuver = rollManeuver(
    defender, false, false, engagement.defenderDisadvantaged, false
  );

  // 3. Shot resolution
  const atkShots: ShotResult[] = [];
  const defShots: ShotResult[] = [];

  // Attacker shots
  for (let i = 0; i < atkManeuver.shotOpportunities; i++) {
    const weapon = getFirstUndepletedWeapon(attacker);
    if (weapon) {
      const hasExtra = hasAdditionalWeapons(attacker, weapon.id);
      atkShots.push(resolveShot(weapon, hasExtra, false));
    }
  }

  // Defender shots
  for (let i = 0; i < defManeuver.shotOpportunities; i++) {
    const weapon = getFirstUndepletedWeapon(defender);
    if (weapon) {
      const hasExtra = hasAdditionalWeapons(defender, weapon.id);
      defShots.push(resolveShot(weapon, hasExtra, false));
    }
  }

  // 4. Damage allocation
  const damageAllocations: DamageAllocationResult[] = [];
  for (const shot of atkShots) {
    if (shot.hit && shot.damageType) {
      damageAllocations.push(allocateDamage(defender, shot.damageType));
    }
  }
  for (const shot of defShots) {
    if (shot.hit && shot.damageType) {
      damageAllocations.push(allocateDamage(attacker, shot.damageType));
    }
  }

  // 5. Depletion
  let atkDepletion: DepletionResult | null = null;
  let defDepletion: DepletionResult | null = null;

  if (atkShots.length > 0) {
    const weapon = getWeapon(atkShots[0].weaponId);
    if (weapon) {
      const secondary = getSecondaryWeaponId(attacker, weapon.id);
      atkDepletion = rollDepletion(weapon, atkShots.length, secondary, false);
    }
  }
  if (defShots.length > 0) {
    const weapon = getWeapon(defShots[0].weaponId);
    if (weapon) {
      const secondary = getSecondaryWeaponId(defender, weapon.id);
      defDepletion = rollDepletion(weapon, defShots.length, secondary, false);
    }
  }

  // 6. Morale
  const atkLosses = damageAllocations.filter(
    (d) => d.resultingDamage === 'shotdown'
  ).length;
  const atkDamaged = damageAllocations.filter(
    (d) => d.resultingDamage === 'damaged' || d.resultingDamage === 'crippled'
  ).length;

  const atkMorale = rollMoraleCheck(attacker, 'standard', 0, 0); // Attacker damage from defender
  const defMorale = rollMoraleCheck(defender, 'standard', atkLosses, atkDamaged);

  // 7. Scatter
  const atkScatter = rollScatter(attacker);
  const defScatter = rollScatter(defender);

  return {
    type: 'standard', engagement,
    attackerManeuver: atkManeuver, defenderManeuver: defManeuver,
    attackerShots: atkShots, defenderShots: defShots,
    attackerDepletion: atkDepletion, defenderDepletion: defDepletion,
    damageAllocations,
    attackerMorale: atkMorale, defenderMorale: defMorale,
    attackerScatter: atkScatter, defenderScatter: defScatter,
  };
}

// ── Helpers ──────────────────────────────────────────────────────

function getFirstUndepletedWeapon(flight: FlightState): AirToAirWeapon | null {
  for (const ac of flight.aircraft) {
    if (ac.damage !== 'none') continue;
    for (const ws of ac.airToAirWeapons) {
      if (!ws.depleted) {
        return getWeapon(ws.weaponId) ?? null;
      }
    }
  }
  return null;
}

function hasAdditionalWeapons(flight: FlightState, currentWeaponId: string): boolean {
  for (const ac of flight.aircraft) {
    if (ac.damage !== 'none') continue;
    for (const ws of ac.airToAirWeapons) {
      if (!ws.depleted && ws.weaponId !== currentWeaponId) return true;
    }
  }
  return false;
}

function getSecondaryWeaponId(flight: FlightState, primaryId: string): string | null {
  for (const ac of flight.aircraft) {
    for (const ws of ac.airToAirWeapons) {
      if (!ws.depleted && ws.weaponId !== primaryId) return ws.weaponId;
    }
  }
  return null;
}
