/**
 * Bot Flight Actions Table.
 *
 * Reference: Rules 33.3, Player Aid Card 5
 *
 * Priority-ordered decision tree for bot flight behavior.
 * The bot evaluates conditions top-to-bottom and takes the
 * first matching action.
 *
 * This is the core AI logic — a direct encoding of the
 * FSP decision tables from Player Aid Card 5.
 */

import { FlightState, GameState, HexCoord, hexToId } from '../../engine/state/GameState';
import { hexDistance, getNeighbor, isInForwardArc, normalizeHeading, hexBearing } from '../../engine/hex';
import { getAircraftData, getSpeed } from '../../data/aircraft/aircraftDatabase';
import { roll1d10 } from '../../engine/rules/detection';

export type BotAction =
  | { type: 'moveToward'; targetHex: HexCoord; reason: string }
  | { type: 'moveAway'; fromHex: HexCoord; reason: string }
  | { type: 'orbit'; reason: string }
  | { type: 'engage'; targetId: string; reason: string }
  | { type: 'rtb'; reason: string }
  | { type: 'continueFlightPath'; reason: string }
  | { type: 'patrol'; reason: string };

interface ActionRule {
  id: string;
  priority: number;
  condition: (flight: FlightState, gameState: GameState, context: BotContext) => boolean;
  action: (flight: FlightState, gameState: GameState, context: BotContext) => BotAction;
}

export interface BotContext {
  nearestEnemyFlight: FlightState | null;
  nearestEnemyDistance: number;
  orbitPoint: HexCoord | null;
  isOnEnemySide: boolean;
  hasFuel: boolean;
  hasWeapons: boolean;
  isWinchester: boolean;    // Out of all weapons
}

/**
 * Build the bot context for a flight.
 */
export function buildBotContext(
  flight: FlightState,
  gameState: GameState
): BotContext {
  // Find nearest detected enemy flight
  let nearestEnemy: FlightState | null = null;
  let nearestDist = Infinity;

  for (const other of Object.values(gameState.flights)) {
    if (other.side === flight.side) continue;
    if (other.isOnGround) continue;
    if (!other.detected) continue;

    const dist = hexDistance(flight.hex, other.hex);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestEnemy = other;
    }
  }

  // Check if on enemy side of front
  const isOnEnemySide = flight.side === 'nato'
    ? gameState.frontHexes.some((fh) => flight.hex.col > fh.col)
    : gameState.frontHexes.some((fh) => flight.hex.col < fh.col);

  // Fuel check
  const hasFuel = flight.fuelUsed < flight.fuelAllowance;

  // Weapons check
  const hasWeapons = flight.aircraft.some((a) =>
    a.damage === 'none' && a.airToAirWeapons.some((w) => !w.depleted)
  );

  const isWinchester = !hasWeapons && !flight.aircraft.some((a) =>
    a.bombStrengthRemaining > 0 || a.ordnance.some((o) => o.shotsRemaining > 0)
  );

  return {
    nearestEnemyFlight: nearestEnemy,
    nearestEnemyDistance: nearestDist,
    orbitPoint: null, // Set by scenario
    isOnEnemySide,
    hasFuel,
    hasWeapons,
    isWinchester,
  };
}

// ── Priority-Ordered Action Rules ────────────────────────────────

const ACTION_RULES: ActionRule[] = [
  // Priority 1: RTB if aborted
  {
    id: 'abort_rtb',
    priority: 1,
    condition: (f) => f.aborted,
    action: (f, gs) => ({
      type: 'rtb',
      reason: 'Flight has aborted — returning to base',
    }),
  },

  // Priority 2: RTB if Winchester (no weapons or ordnance)
  {
    id: 'winchester_rtb',
    priority: 2,
    condition: (f, gs, ctx) => ctx.isWinchester,
    action: () => ({
      type: 'rtb',
      reason: 'Winchester — no weapons remaining',
    }),
  },

  // Priority 3: RTB if all aircraft damaged/crippled
  {
    id: 'damaged_rtb',
    priority: 3,
    condition: (f) => f.aircraft.every((a) => a.damage !== 'none'),
    action: () => ({
      type: 'rtb',
      reason: 'All aircraft damaged — returning to base',
    }),
  },

  // Priority 4: Engage detected enemy within 10 hexes (CAP/Close Escort)
  {
    id: 'engage_close_enemy',
    priority: 4,
    condition: (f, gs, ctx) => {
      if (f.task !== 'cap' && f.task !== 'closeEscort' && f.task !== 'rescueSupport') return false;
      if (!ctx.hasWeapons) return false;
      if (f.disordered) return false;
      return ctx.nearestEnemyDistance <= 10 && ctx.nearestEnemyFlight !== null;
    },
    action: (f, gs, ctx) => ({
      type: 'moveToward',
      targetHex: ctx.nearestEnemyFlight!.hex,
      reason: `Intercepting ${ctx.nearestEnemyFlight!.id} (${Math.round(ctx.nearestEnemyDistance)} hexes)`,
    }),
  },

  // Priority 5: Engage enemy in same hex or adjacent (any combat-capable flight)
  {
    id: 'engage_adjacent',
    priority: 5,
    condition: (f, gs, ctx) => {
      if (!ctx.hasWeapons) return false;
      if (f.disordered) return false;
      return ctx.nearestEnemyDistance <= 1 && ctx.nearestEnemyFlight !== null;
    },
    action: (f, gs, ctx) => ({
      type: 'engage',
      targetId: ctx.nearestEnemyFlight!.id,
      reason: `Engaging ${ctx.nearestEnemyFlight!.id} in close range`,
    }),
  },

  // Priority 6: Continue flight path (bombing/recon flights)
  {
    id: 'follow_flight_path',
    priority: 6,
    condition: (f) => {
      return (f.task === 'bombing' || f.task === 'recon' || f.task === 'transport') &&
        f.flightPath !== null && f.flightPath.length > 0;
    },
    action: (f) => ({
      type: 'continueFlightPath',
      reason: `Following flight path to waypoint ${f.currentWaypointIndex + 1}`,
    }),
  },

  // Priority 7: Move toward detected enemy within 20 hexes (CAP)
  {
    id: 'pursue_enemy',
    priority: 7,
    condition: (f, gs, ctx) => {
      if (f.task !== 'cap') return false;
      if (!ctx.hasWeapons) return false;
      return ctx.nearestEnemyDistance <= 20 && ctx.nearestEnemyFlight !== null;
    },
    action: (f, gs, ctx) => ({
      type: 'moveToward',
      targetHex: ctx.nearestEnemyFlight!.hex,
      reason: `Pursuing ${ctx.nearestEnemyFlight!.id} (${Math.round(ctx.nearestEnemyDistance)} hexes)`,
    }),
  },

  // Priority 8: Patrol near orbit point (CAP with no targets)
  {
    id: 'patrol_orbit',
    priority: 8,
    condition: (f, gs, ctx) => {
      return f.task === 'cap' && ctx.orbitPoint !== null;
    },
    action: (f, gs, ctx) => {
      const distToOrbit = hexDistance(f.hex, ctx.orbitPoint!);
      if (distToOrbit > 3) {
        return { type: 'moveToward', targetHex: ctx.orbitPoint!, reason: 'Returning to orbit point' };
      }
      return { type: 'patrol', reason: 'Patrolling near orbit point' };
    },
  },

  // Priority 9: Move away from front if on wrong side
  {
    id: 'retreat_from_enemy_side',
    priority: 9,
    condition: (f, gs, ctx) => ctx.isOnEnemySide && f.task !== 'bombing' && f.task !== 'sead',
    action: (f) => {
      // Move toward own map edge
      const targetCol = f.side === 'nato' ? 30 : 70;
      return {
        type: 'moveToward',
        targetHex: { col: targetCol, row: f.hex.row },
        reason: 'Withdrawing from enemy territory',
      };
    },
  },

  // Priority 10: Default - patrol in place
  {
    id: 'default_patrol',
    priority: 10,
    condition: () => true,
    action: () => ({
      type: 'patrol',
      reason: 'No priority action — holding position',
    }),
  },
];

/**
 * Determine the action for a bot flight.
 * Evaluates rules top-to-bottom, returns first matching action.
 */
export function determineBotAction(
  flight: FlightState,
  gameState: GameState,
  context?: BotContext
): BotAction {
  const ctx = context ?? buildBotContext(flight, gameState);

  for (const rule of ACTION_RULES) {
    if (rule.condition(flight, gameState, ctx)) {
      return rule.action(flight, gameState, ctx);
    }
  }

  // Should never reach here due to default rule
  return { type: 'patrol', reason: 'Default action' };
}

/**
 * Convert a bot action into concrete movement decisions.
 * Returns the heading and throttle the bot flight should use.
 */
export function resolveBotMovement(
  flight: FlightState,
  action: BotAction,
  gameState: GameState
): { heading: number; throttle: 'combat' | 'dash'; speed: number } {
  const aircraft = getAircraftData(flight.aircraftType);
  const isLaden = flight.aircraft.some((a) => a.bombStrengthRemaining > 0);

  // Default to combat throttle at max speed
  let throttle: 'combat' | 'dash' = 'combat';
  let maxSpeed = aircraft ? (getSpeed(aircraft, flight.altitude, 'combat', isLaden) ?? 4) : 4;
  let heading = flight.heading;

  switch (action.type) {
    case 'moveToward': {
      heading = Math.round(hexBearing(flight.hex, action.targetHex) / 30) * 30;
      // Use dash if far away and not crippled
      const dist = hexDistance(flight.hex, action.targetHex);
      if (dist > 8 && !flight.aircraft.some((a) => a.damage === 'crippled')) {
        throttle = 'dash';
        maxSpeed = aircraft ? (getSpeed(aircraft, flight.altitude, 'dash', isLaden) ?? maxSpeed) : maxSpeed;
      }
      break;
    }

    case 'moveAway': {
      // Opposite direction from threat
      const awayBearing = hexBearing(action.fromHex, flight.hex);
      heading = Math.round(awayBearing / 30) * 30;
      throttle = 'dash';
      maxSpeed = aircraft ? (getSpeed(aircraft, flight.altitude, 'dash', isLaden) ?? maxSpeed) : maxSpeed;
      break;
    }

    case 'rtb': {
      // Head toward own map edge
      const exitCol = flight.side === 'nato' ? 0 : 79;
      heading = Math.round(hexBearing(flight.hex, { col: exitCol, row: flight.hex.row }) / 30) * 30;
      throttle = 'combat';
      break;
    }

    case 'engage': {
      const target = gameState.flights[action.targetId];
      if (target) {
        heading = Math.round(hexBearing(flight.hex, target.hex) / 30) * 30;
      }
      throttle = 'combat';
      break;
    }

    case 'patrol':
    case 'orbit': {
      // Gentle turn: add 30 degrees each turn for an orbit pattern
      heading = normalizeHeading(flight.heading + 30);
      break;
    }

    case 'continueFlightPath': {
      if (flight.flightPath && flight.currentWaypointIndex < flight.flightPath.length) {
        const wp = flight.flightPath[flight.currentWaypointIndex];
        heading = Math.round(hexBearing(flight.hex, wp.hex) / 30) * 30;
      }
      break;
    }
  }

  return {
    heading: normalizeHeading(heading),
    throttle,
    speed: Math.max(1, maxSpeed),
  };
}
