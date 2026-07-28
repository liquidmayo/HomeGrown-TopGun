/**
 * Hex coordinate math for Red Storm.
 *
 * The game uses flat-top hexes with an offset coordinate system.
 * Coordinates are 4-digit: first two = column (00-79), last two = row (00-50).
 * Odd columns are shifted down by half a hex height.
 *
 * Heading/facing uses 30-degree increments: 0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330.
 * 0 degrees = pointing right (east). Hex corners are at 0, 60, 120, 180, 240, 300.
 * Hex sides (flat-top) face at 30, 90, 150, 210, 270, 330 degrees.
 *
 * References: Rules sections 2.21, 4.3, 6.1, 6.11, 22.1
 */

import { HexCoord, hexToId, AltitudeBand } from './state/GameState';

// ── Neighbor Directions ──────────────────────────────────────────
// For flat-top offset coordinates (odd-q offset), the 6 neighbors differ
// depending on whether the column is even or odd.

/** Direction indices: 0=E, 1=NE, 2=NW, 3=W, 4=SW, 5=SE */
export type HexDirection = 0 | 1 | 2 | 3 | 4 | 5;

// Even column neighbor offsets [dcol, drow]
const EVEN_COL_NEIGHBORS: [number, number][] = [
  [+1, 0],   // 0: E
  [+1, -1],  // 1: NE
  [-1, -1],  // 2: NW
  [-1, 0],   // 3: W
  [-1, +1],  // 4: SW
  [+1, +1],  // 5: SE
];

// Odd column neighbor offsets [dcol, drow]
const ODD_COL_NEIGHBORS: [number, number][] = [
  [+1, 0],   // 0: E
  [+1, -1],  // 1: NE  -- adjusted: odd cols shift means different offsets
  [-1, -1],  // 2: NW
  [-1, 0],   // 3: W
  [-1, +1],  // 4: SW
  [+1, +1],  // 5: SE
];

// Actually for flat-top odd-q offset:
// Even columns:
//   E:  (+1,  0), NE: (+1, -1), NW: (-1, -1), W: (-1,  0), SW: (-1, +1), SE: (+1, +1)
//   Wait - let me reconsider. The standard flat-top odd-q offset coordinate system:
//
// For EVEN columns (col % 2 === 0):
//   Direction  dcol  drow
//   E          +1     0
//   NE         +1    -1
//   NW         -1    -1
//   W          -1     0
//   SW         -1     0   <-- No, this isn't right either
//
// Let me use the standard reference. For flat-top hexes with "odd-q" offset
// (odd columns shifted down):
//
// Even columns:                    Odd columns:
//   E:  (+1,  0)                     E:  (+1,  0)
//   NE: (+1, -1)                     NE: (+1,  0)   -- different!
//   NW: (-1, -1)                     NW: (-1,  0)   -- different!
//   W:  (-1,  0)                     W:  (-1,  0)
//   SW: (-1,  0)                     SW: (-1, +1)   -- different!
//   SE: (+1,  0)                     SE: (+1, +1)   -- different!
//
// Hmm, that's also not right. Let me think more carefully.
// In a flat-top hex with odd-q offset where odd columns are shifted DOWN:
// - row increases downward (south)
// - col increases rightward (east)

// Let me just define this correctly with standard hex math:
// For flat-top hexes, the 6 directions map to clock positions:
// dir 0 = right (E), dir 1 = upper-right (NE), dir 2 = upper-left (NW),
// dir 3 = left (W), dir 4 = lower-left (SW), dir 5 = lower-right (SE)

const NEIGHBOR_OFFSETS: Record<'even' | 'odd', [number, number][]> = {
  even: [
    [+1,  0],  // E
    [+1, -1],  // NE
    [-1, -1],  // NW
    [-1,  0],  // W
    [-1, +1],  // SW
    [+1, +1],  // SE
  ],
  odd: [
    [+1,  0],  // E
    [+1,  0],  // NE  (odd col shifted down, so NE neighbor is same row)
    [-1,  0],  // NW
    [-1,  0],  // W  -- wait this can't be right, W and NW can't be same
  ],
};

// OK let me just do this properly with cube coordinates and convert.

// ── Cube Coordinates (internal) ──────────────────────────────────
// Cube coords (q, r, s) where q + r + s = 0. Much easier for math.

interface CubeCoord {
  q: number;
  r: number;
  s: number;
}

/** Convert offset (col, row) to cube coordinates.
 *  Using flat-top, odd-q offset (odd columns shifted down). */
export function offsetToCube(col: number, row: number): CubeCoord {
  const q = col;
  const r = row - Math.floor((col - (col & 1)) / 2);
  const s = -q - r;
  return { q, r, s };
}

/** Convert cube coordinates back to offset (col, row). */
export function cubeToOffset(q: number, r: number): HexCoord {
  const col = q;
  const row = r + Math.floor((q - (q & 1)) / 2);
  return { col, row };
}

// Cube direction vectors for the 6 neighbors
const CUBE_DIRECTIONS: CubeCoord[] = [
  { q: +1, r:  0, s: -1 },  // 0: E
  { q: +1, r: -1, s:  0 },  // 1: NE
  { q:  0, r: -1, s: +1 },  // 2: NW
  { q: -1, r:  0, s: +1 },  // 3: W
  { q: -1, r: +1, s:  0 },  // 4: SW
  { q:  0, r: +1, s: -1 },  // 5: SE
];

// ── Public Hex Functions ─────────────────────────────────────────

/** Get the 6 neighboring hex coordinates. */
export function getNeighbors(hex: HexCoord): HexCoord[] {
  const cube = offsetToCube(hex.col, hex.row);
  return CUBE_DIRECTIONS.map((dir) =>
    cubeToOffset(cube.q + dir.q, cube.r + dir.r)
  );
}

/** Get the neighbor in a specific direction (0=E, 1=NE, 2=NW, 3=W, 4=SW, 5=SE). */
export function getNeighbor(hex: HexCoord, direction: HexDirection): HexCoord {
  const cube = offsetToCube(hex.col, hex.row);
  const dir = CUBE_DIRECTIONS[direction];
  return cubeToOffset(cube.q + dir.q, cube.r + dir.r);
}

/**
 * Calculate the distance in hexes between two hex coordinates.
 * Per rule 2.21: "trace the shortest possible path from one map hex to another
 * and count the number of hexes the path enters."
 */
export function hexDistance(a: HexCoord, b: HexCoord): number {
  const ac = offsetToCube(a.col, a.row);
  const bc = offsetToCube(b.col, b.row);
  return Math.max(
    Math.abs(ac.q - bc.q),
    Math.abs(ac.r - bc.r),
    Math.abs(ac.s - bc.s)
  );
}

/**
 * Get all hexes on a line from a to b (for LOS checks, bomb runs, etc.).
 * Uses cube coordinate linear interpolation.
 * Returns the list of hex coordinates from a to b inclusive.
 */
export function hexLine(a: HexCoord, b: HexCoord): HexCoord[] {
  const dist = hexDistance(a, b);
  if (dist === 0) return [a];

  const ac = offsetToCube(a.col, a.row);
  const bc = offsetToCube(b.col, b.row);

  const results: HexCoord[] = [];
  for (let i = 0; i <= dist; i++) {
    const t = i / dist;
    const q = ac.q + (bc.q - ac.q) * t;
    const r = ac.r + (bc.r - ac.r) * t;
    const s = ac.s + (bc.s - ac.s) * t;
    const rounded = cubeRound(q, r, s);
    results.push(cubeToOffset(rounded.q, rounded.r));
  }
  return results;
}

/** Round fractional cube coordinates to the nearest hex. */
function cubeRound(q: number, r: number, s: number): CubeCoord {
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);

  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);

  if (dq > dr && dq > ds) {
    rq = -rr - rs;
  } else if (dr > ds) {
    rr = -rq - rs;
  } else {
    rs = -rq - rr;
  }

  return { q: rq, r: rr, s: rs };
}

/**
 * Get all hexes within a given range of a center hex.
 * Returns hexes where hexDistance(center, hex) <= range.
 */
export function hexesInRange(center: HexCoord, range: number): HexCoord[] {
  const cc = offsetToCube(center.col, center.row);
  const results: HexCoord[] = [];

  for (let q = -range; q <= range; q++) {
    for (let r = Math.max(-range, -q - range); r <= Math.min(range, -q + range); r++) {
      const s = -q - r;
      results.push(cubeToOffset(cc.q + q, cc.r + r));
    }
  }
  return results;
}

/**
 * Get the ring of hexes at exactly the given distance from center.
 */
export function hexRing(center: HexCoord, radius: number): HexCoord[] {
  if (radius === 0) return [center];

  const results: HexCoord[] = [];
  const cc = offsetToCube(center.col, center.row);

  // Start at the hex radius steps in direction 4 (SW), walk around the ring
  let cube: CubeCoord = {
    q: cc.q + CUBE_DIRECTIONS[4].q * radius,
    r: cc.r + CUBE_DIRECTIONS[4].r * radius,
    s: cc.s + CUBE_DIRECTIONS[4].s * radius,
  };

  for (let dir = 0; dir < 6; dir++) {
    for (let step = 0; step < radius; step++) {
      results.push(cubeToOffset(cube.q, cube.r));
      cube = {
        q: cube.q + CUBE_DIRECTIONS[dir].q,
        r: cube.r + CUBE_DIRECTIONS[dir].r,
        s: cube.s + CUBE_DIRECTIONS[dir].s,
      };
    }
  }
  return results;
}

// ── Arcs and Hemispheres ─────────────────────────────────────────
// Per rule 4.3: There are six 60-degree arcs around a flight.
// Forward hemisphere = 3 forward arcs, rear hemisphere = 3 rear arcs.
// The flight's heading determines which arcs are forward and rear.

/**
 * Arc names as used in the game. A flight has 6 arcs based on heading:
 * - Forward Arc (directly ahead)
 * - Forward Beam Right / Forward Beam Left (60 degrees off each side)
 * - Rear Beam Right / Rear Beam Left (120 degrees off each side)
 * - Rear Arc (directly behind)
 */
export type Arc =
  | 'forward'
  | 'forwardBeamRight'
  | 'forwardBeamLeft'
  | 'rearBeamRight'
  | 'rearBeamLeft'
  | 'rear';

export type Hemisphere = 'forward' | 'rear';

/**
 * Determine which arc a target hex falls in relative to an origin hex and heading.
 * Heading is in degrees (0 = east, 90 = south, etc. clockwise).
 *
 * Per rule 4.3: "An enemy flight or ground unit is within an arc if more than half
 * the hex is contained in an arc zone."
 */
export function getArc(
  origin: HexCoord,
  heading: number,
  target: HexCoord
): Arc {
  // Calculate bearing from origin to target
  const bearing = hexBearing(origin, target);

  // Calculate relative angle (target bearing minus heading, normalized to 0-360)
  let relative = ((bearing - heading) % 360 + 360) % 360;

  // Map to arcs (each arc is 60 degrees wide)
  if (relative < 30 || relative >= 330) return 'forward';
  if (relative < 90) return 'forwardBeamRight';
  if (relative < 150) return 'rearBeamRight';
  if (relative < 210) return 'rear';
  if (relative < 270) return 'rearBeamLeft';
  return 'forwardBeamLeft';
}

/**
 * Determine which hemisphere a target is in relative to an origin and heading.
 */
export function getHemisphere(
  origin: HexCoord,
  heading: number,
  target: HexCoord
): Hemisphere {
  const arc = getArc(origin, heading, target);
  if (arc === 'forward' || arc === 'forwardBeamRight' || arc === 'forwardBeamLeft') {
    return 'forward';
  }
  return 'rear';
}

/**
 * Check if a target is in the forward arc of a flight.
 * Many rules require the target to be in the "forward arc" specifically.
 */
export function isInForwardArc(
  origin: HexCoord,
  heading: number,
  target: HexCoord
): boolean {
  return getArc(origin, heading, target) === 'forward';
}

/**
 * Check if a target is in the forward hemisphere (any of the 3 forward arcs).
 */
export function isInForwardHemisphere(
  origin: HexCoord,
  heading: number,
  target: HexCoord
): boolean {
  return getHemisphere(origin, heading, target) === 'forward';
}

/**
 * Calculate the approximate bearing (in degrees, 0=east, clockwise) from one hex to another.
 * Uses pixel positions for accuracy.
 */
export function hexBearing(from: HexCoord, to: HexCoord): number {
  const fp = hexToPixel(from.col, from.row);
  const tp = hexToPixel(to.col, to.row);

  const dx = tp.x - fp.x;
  const dy = tp.y - fp.y;

  // atan2 gives angle from positive x-axis, counter-clockwise
  // We want clockwise from east (positive x), with y increasing downward
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  return ((angle % 360) + 360) % 360;
}

// ── Pixel Conversion ─────────────────────────────────────────────
// Used for rendering and bearing calculations.

/** Hex rendering size (radius, center to corner) */
export const HEX_SIZE = 28;
export const HEX_WIDTH = HEX_SIZE * 2;
export const HEX_HEIGHT = Math.sqrt(3) * HEX_SIZE;

/** Convert hex grid coordinate to pixel center position (flat-top offset). */
export function hexToPixel(col: number, row: number): { x: number; y: number } {
  const x = col * HEX_WIDTH * 0.75 + HEX_SIZE;
  const y = row * HEX_HEIGHT + (col % 2 === 1 ? HEX_HEIGHT / 2 : 0) + HEX_HEIGHT / 2;
  return { x, y };
}

/** Convert pixel position to nearest hex coordinate. */
export function pixelToHex(px: number, py: number): HexCoord {
  // Use cube-based rounding for accuracy
  const q = (px - HEX_SIZE) / (HEX_WIDTH * 0.75);

  // Estimate row, accounting for odd column offset
  const approxCol = Math.round(q);
  const rowOffset = approxCol % 2 === 1 ? HEX_HEIGHT / 2 : 0;
  const r = (py - HEX_HEIGHT / 2 - rowOffset) / HEX_HEIGHT;

  const col = Math.max(0, Math.min(79, Math.round(q)));
  const row = Math.max(0, Math.min(50, Math.round(r)));
  return { col, row };
}

/** Get the 6 corner points of a flat-top hex as a flat array [x1,y1,x2,y2,...]. */
export function hexCorners(cx: number, cy: number, size: number): number[] {
  const points: number[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i);
    points.push(cx + size * Math.cos(angle));
    points.push(cy + size * Math.sin(angle));
  }
  return points;
}

// ── Line of Sight ────────────────────────────────────────────────
// Per rule 22.1: LOS is blocked by cloud layers, broken cloud at >2 hex range,
// and mountains between two Deck-altitude units.

/**
 * Check if line of sight exists between two hexes.
 * This is a simplified version that checks terrain-based blocking.
 * Weather-based blocking is handled separately.
 *
 * @param from Source hex
 * @param to Target hex
 * @param fromAltitude Altitude of the source
 * @param toAltitude Altitude of the target
 * @param getTerrainFn Function to look up terrain types for a hex
 * @returns true if LOS is clear
 */
export function hasLineOfSight(
  from: HexCoord,
  to: HexCoord,
  fromAltitude: AltitudeBand,
  toAltitude: AltitudeBand,
  getTerrainFn: (hex: HexCoord) => string[]
): boolean {
  // Rule 22.1c: Both on Deck, blocked by Mountain hex between them
  if (fromAltitude === 'deck' && toAltitude === 'deck') {
    const line = hexLine(from, to);
    // Check intervening hexes (not the endpoints)
    for (let i = 1; i < line.length - 1; i++) {
      const terrain = getTerrainFn(line[i]);
      if (terrain.includes('mountain')) {
        return false;
      }
    }
  }

  return true;
}

// ── Altitude Helpers ─────────────────────────────────────────────

const ALTITUDE_ORDER: AltitudeBand[] = ['deck', 'low', 'medium', 'high', 'veryHigh'];

/** Get the numeric index of an altitude band (0=deck, 4=veryHigh). */
export function altitudeIndex(alt: AltitudeBand): number {
  return ALTITUDE_ORDER.indexOf(alt);
}

/** Get the altitude band from a numeric index. */
export function altitudeFromIndex(index: number): AltitudeBand {
  return ALTITUDE_ORDER[Math.max(0, Math.min(4, index))];
}

/** Check if altitude a is higher than altitude b. */
export function isHigherAltitude(a: AltitudeBand, b: AltitudeBand): boolean {
  return altitudeIndex(a) > altitudeIndex(b);
}

/** Get the number of altitude bands between two altitudes. */
export function altitudeDifference(a: AltitudeBand, b: AltitudeBand): number {
  return Math.abs(altitudeIndex(a) - altitudeIndex(b));
}

// ── Heading Helpers ──────────────────────────────────────────────

/** Normalize a heading to 0-330 in 30-degree increments. */
export function normalizeHeading(heading: number): number {
  const h = ((heading % 360) + 360) % 360;
  return Math.round(h / 30) * 30 % 360;
}

/** Calculate the smallest angular difference between two headings. */
export function headingDifference(a: number, b: number): number {
  const diff = Math.abs(normalizeHeading(a) - normalizeHeading(b));
  return Math.min(diff, 360 - diff);
}

/** Get the opposite heading (180 degrees away). */
export function oppositeHeading(heading: number): number {
  return normalizeHeading(heading + 180);
}

// ── Validation ───────────────────────────────────────────────────

/** Check if a hex coordinate is within the valid map bounds. */
export function isValidHex(hex: HexCoord): boolean {
  return hex.col >= 0 && hex.col <= 79 && hex.row >= 0 && hex.row <= 50;
}

/** Check if a hex is within a scenario's play area. */
export function isInPlayArea(
  hex: HexCoord,
  minCol: number,
  maxCol: number,
  minRow: number,
  maxRow: number
): boolean {
  return (
    hex.col >= minCol &&
    hex.col <= maxCol &&
    hex.row >= minRow &&
    hex.row <= maxRow
  );
}
