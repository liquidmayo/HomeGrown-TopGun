/**
 * Victory Point calculation and scenario victory.
 * Reference: Rules section 32.0
 */

import { FlightState, GroundUnitState, GameState, Side } from '../state/GameState';

export interface VPTally {
  aircraftShotDown: number;
  aircraftDamaged: number;
  crewCaptured: number;
  groundTargets: number;
  samDestroyed: number;
  bonusVP: number;
  total: number;
}

/**
 * Standard VP values. Rule 32.1
 */
const VP_VALUES = {
  aircraftShotDown: 3,       // Per aircraft shot down
  aircraftDamaged: 1,        // Per aircraft damaged (not recovered)
  crewCaptured: 1,           // Per crew member captured
  samDestroyed_slight: 1,
  samDestroyed_heavy: 2,
  samDestroyed_total: 3,
  aaaDestroyed: 1,
  ewrDestroyed: 2,
};

/**
 * Calculate VP for a side based on damage inflicted on the enemy.
 */
export function calculateVP(
  gameState: GameState,
  scoringSide: Side
): VPTally {
  const enemySide: Side = scoringSide === 'nato' ? 'wp' : 'nato';
  let aircraftShotDown = 0;
  let aircraftDamaged = 0;
  let crewCaptured = 0;
  let groundTargets = 0;
  let samDestroyed = 0;
  let bonusVP = 0;

  // Count enemy aircraft losses
  for (const flight of Object.values(gameState.flights)) {
    if (flight.side !== enemySide) continue;
    for (const ac of flight.aircraft) {
      if (ac.damage === 'shotdown') aircraftShotDown += VP_VALUES.aircraftShotDown;
      // Damaged/crippled aircraft that didn't recover count
      if (ac.damage === 'damaged') aircraftDamaged += VP_VALUES.aircraftDamaged;
      if (ac.damage === 'crippled') aircraftDamaged += VP_VALUES.aircraftDamaged;

      // Captured crew
      for (const status of ac.crewStatus) {
        if (status === 'captured') crewCaptured += VP_VALUES.crewCaptured;
      }
    }
  }

  // Count enemy ground unit damage
  for (const unit of Object.values(gameState.groundUnits)) {
    if (unit.side !== enemySide) continue;
    if (unit.isDummy) continue;

    if (unit.type === 'sam') {
      if (unit.damage === 'destroyed') samDestroyed += VP_VALUES.samDestroyed_total;
      else if (unit.damage === 'heavy') samDestroyed += VP_VALUES.samDestroyed_heavy;
      else if (unit.damage === 'slight') samDestroyed += VP_VALUES.samDestroyed_slight;
    } else if (unit.type === 'ewr') {
      if (unit.damage === 'destroyed') groundTargets += VP_VALUES.ewrDestroyed;
    } else if (unit.type === 'aaaConcentation' || unit.type === 'radarAAA' || unit.type === 'mobileAAA') {
      if (unit.damage === 'destroyed') groundTargets += VP_VALUES.aaaDestroyed;
    } else {
      // Army ground units
      if (unit.damage === 'destroyed') groundTargets += 3;
      else if (unit.damage === 'heavy') groundTargets += 2;
      else if (unit.damage === 'slight') groundTargets += 1;
    }
  }

  const total = aircraftShotDown + aircraftDamaged + crewCaptured + groundTargets + samDestroyed + bonusVP;

  return { aircraftShotDown, aircraftDamaged, crewCaptured, groundTargets, samDestroyed, bonusVP, total };
}

/** Victory Level Table. Rule 32.2 */
export type VictoryLevel = 'decisiveWin' | 'substantialWin' | 'marginalWin' | 'draw' | 'marginalLoss' | 'substantialLoss' | 'decisiveLoss';

export function determineVictoryLevel(
  natoVP: number, wpVP: number, humanSide: Side
): { level: VictoryLevel; humanVP: number; botVP: number; margin: number } {
  const humanVP = humanSide === 'nato' ? natoVP : wpVP;
  const botVP = humanSide === 'nato' ? wpVP : natoVP;
  const margin = humanVP - botVP;

  let level: VictoryLevel;
  if (margin >= 15) level = 'decisiveWin';
  else if (margin >= 10) level = 'substantialWin';
  else if (margin >= 5) level = 'marginalWin';
  else if (margin >= -4) level = 'draw';
  else if (margin >= -9) level = 'marginalLoss';
  else if (margin >= -14) level = 'substantialLoss';
  else level = 'decisiveLoss';

  return { level, humanVP, botVP, margin };
}
