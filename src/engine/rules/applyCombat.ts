/**
 * Apply combat resolution results to game state.
 * This persists damage, morale effects, scatter, and depletion.
 */

import { GameState, FlightState, DamageLevel } from '../state/GameState';
import { CombatResolution } from './combat';

/**
 * Apply all results from a standard or BVR combat to game state.
 * Updates both attacker and defender flights with damage, morale, markers, and depletion.
 */
export function applyCombatResults(
  state: GameState,
  attackerId: string,
  defenderId: string,
  combat: CombatResolution
): GameState {
  const flights = { ...state.flights };
  let attacker = { ...flights[attackerId], aircraft: flights[attackerId].aircraft.map(a => ({ ...a })) };
  let defender = { ...flights[defenderId], aircraft: flights[defenderId].aircraft.map(a => ({ ...a })) };

  if (!combat.engagement.combatOccurs) {
    return state;
  }

  // ── Apply damage allocations ──
  for (const dmg of combat.damageAllocations) {
    // Determine which flight was hit based on whether the shot came from attacker or defender
    // Attacker shots hit defender, defender shots hit attacker
    // The damage allocations are in order: attacker shots first, then defender shots
    // We need to figure out which flight each allocation targets

    // For simplicity: allocations from attackerShots target defender,
    // allocations from defenderShots target attacker
    // The current allocateDamage function was called with the target flight,
    // so we need to reconstruct which flight was targeted.

    // Since combat.damageAllocations includes results from both sides,
    // and we called allocateDamage(defender, ...) for attacker shots
    // and allocateDamage(attacker, ...) for defender shots,
    // the allocations are interleaved. Let's apply by checking aircraft index.

    // Actually, the allocations need to know which flight they belong to.
    // Let's use a simpler approach: reapply damage from shot results directly.
  }

  // Reapply damage from shots directly to the correct flights
  // Attacker's shots damage the defender
  for (const shot of combat.attackerShots) {
    if (shot.hit && shot.damageType) {
      applyDamageToFlight(defender, shot.damageType);
    }
  }
  // Defender's shots damage the attacker
  for (const shot of combat.defenderShots) {
    if (shot.hit && shot.damageType) {
      applyDamageToFlight(attacker, shot.damageType);
    }
  }

  // ── Apply morale results ──
  if (combat.attackerMorale) {
    attacker = applyMoraleResult(attacker, combat.attackerMorale.result, combat.attackerMorale.aggressionChange);
  }
  if (combat.defenderMorale) {
    defender = applyMoraleResult(defender, combat.defenderMorale.result, combat.defenderMorale.aggressionChange);
  }

  // ── Apply scatter (standard combat only) ──
  if (combat.type === 'standard') {
    const altOrder: ('deck'|'low'|'medium'|'high'|'veryHigh')[] = ['deck','low','medium','high','veryHigh'];

    if (combat.attackerScatter) {
      const s = combat.attackerScatter;
      let newAlt = attacker.altitude;
      if (s.altitudeChange < 0) {
        const idx = altOrder.indexOf(attacker.altitude);
        if (idx > 0) newAlt = altOrder[idx - 1];
      }
      const newHeading = ((attacker.heading + s.headingChange) % 360 + 360) % 360;
      attacker = { ...attacker, hex: s.newHex, altitude: newAlt, heading: newHeading };
      if (!attacker.markers.includes('maneuver')) {
        attacker = { ...attacker, markers: [...attacker.markers, 'maneuver'] };
      }
    }
    if (combat.defenderScatter) {
      const s = combat.defenderScatter;
      let newAlt = defender.altitude;
      if (s.altitudeChange < 0) {
        const idx = altOrder.indexOf(defender.altitude);
        if (idx > 0) newAlt = altOrder[idx - 1];
      }
      const newHeading = ((defender.heading + s.headingChange) % 360 + 360) % 360;
      defender = { ...defender, hex: s.newHex, altitude: newAlt, heading: newHeading };
      if (!defender.markers.includes('maneuver')) {
        defender = { ...defender, markers: [...defender.markers, 'maneuver'] };
      }
    }

    // Both flights become undetected after standard combat (13.3)
    attacker = { ...attacker, detected: false };
    defender = { ...defender, detected: false };
  }

  // ── Apply ammo depletion ──
  if (combat.attackerDepletion?.depleted) {
    depleteWeapon(attacker, combat.attackerDepletion.weaponId);
    if (combat.attackerDepletion.secondaryDepleted && combat.attackerDepletion.secondaryWeaponId) {
      depleteWeapon(attacker, combat.attackerDepletion.secondaryWeaponId);
    }
  }
  if (combat.defenderDepletion?.depleted) {
    depleteWeapon(defender, combat.defenderDepletion.weaponId);
    if (combat.defenderDepletion.secondaryDepleted && combat.defenderDepletion.secondaryWeaponId) {
      depleteWeapon(defender, combat.defenderDepletion.secondaryWeaponId);
    }
  }

  // ── Mark fuel usage (both flights use 1 fuel for standard combat) ──
  if (combat.type === 'standard') {
    attacker = { ...attacker, fuelUsed: attacker.fuelUsed + 1 };
    defender = { ...defender, fuelUsed: defender.fuelUsed + 1 };
  }

  // Check if flights are eliminated
  if (attacker.aircraft.every(a => a.damage === 'shotdown')) {
    // Flight eliminated - could remove from state
  }
  if (defender.aircraft.every(a => a.damage === 'shotdown')) {
    // Flight eliminated
  }

  flights[attackerId] = attacker;
  flights[defenderId] = defender;

  return {
    ...state,
    flights,
    eventLog: [
      ...state.eventLog,
      {
        turn: state.turn, phase: state.phase, timestamp: Date.now(),
        type: 'combat',
        message: `${attackerId} engages ${defenderId}: ${combat.engagement.outcome}. ` +
          `Attacker shots: ${combat.attackerShots.filter(s => s.hit).length} hits. ` +
          `Defender shots: ${combat.defenderShots.filter(s => s.hit).length} hits.`,
      },
    ],
  };
}

/** Apply a single damage result to the next available aircraft in the flight. */
function applyDamageToFlight(flight: FlightState, damageType: DamageLevel): void {
  // Find the aircraft to damage (prefer undamaged, then damaged, avoid shotdown)
  const alive = flight.aircraft.filter(a => a.damage !== 'shotdown');
  if (alive.length === 0) return;

  // Random allocation among alive aircraft
  const targetIdx = Math.floor(Math.random() * alive.length);
  const target = alive[targetIdx];

  // Escalate damage
  let result: DamageLevel = damageType;
  if (target.damage === 'damaged') {
    if (damageType === 'damaged') result = 'crippled';
    else result = damageType;
  } else if (target.damage === 'crippled') {
    result = 'shotdown';
  }

  // Find the actual index in the aircraft array and update
  const actualIdx = flight.aircraft.indexOf(target);
  if (actualIdx >= 0) {
    flight.aircraft[actualIdx] = { ...flight.aircraft[actualIdx], damage: result };
  }
}

/** Apply morale check result to a flight. */
function applyMoraleResult(
  flight: FlightState,
  result: string,
  aggressionChange: number
): FlightState {
  let updated = { ...flight, aggressionValue: Math.max(-3, flight.aggressionValue + aggressionChange) };

  switch (result) {
    case 'disordered':
      updated = { ...updated, disordered: true };
      break;
    case 'abort':
      updated = { ...updated, aborted: true, disordered: true };
      break;
    case 'jettison':
      // Jettison ordnance check handled separately
      break;
  }

  return updated;
}

/** Deplete a weapon across all aircraft in a flight. */
function depleteWeapon(flight: FlightState, weaponId: string): void {
  for (const ac of flight.aircraft) {
    for (const w of ac.airToAirWeapons) {
      if (w.weaponId === weaponId && !w.depleted) {
        w.depleted = true;
        return; // Deplete one instance
      }
    }
  }
}
