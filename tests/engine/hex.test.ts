import { describe, it, expect } from 'vitest';
import {
  getNeighbors,
  getNeighbor,
  hexDistance,
  hexLine,
  hexesInRange,
  hexRing,
  getArc,
  getHemisphere,
  isInForwardArc,
  isInForwardHemisphere,
  hexBearing,
  normalizeHeading,
  headingDifference,
  oppositeHeading,
  isValidHex,
  isInPlayArea,
  altitudeIndex,
  altitudeDifference,
  isHigherAltitude,
  offsetToCube,
  cubeToOffset,
  hasLineOfSight,
} from '@engine/hex';
import { HexCoord } from '@engine/state/GameState';

describe('Cube Coordinate Conversions', () => {
  it('round-trips offset -> cube -> offset', () => {
    const testCoords: HexCoord[] = [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 5, row: 5 },
      { col: 51, row: 26 },
      { col: 10, row: 10 },
      { col: 79, row: 50 },
    ];
    for (const coord of testCoords) {
      const cube = offsetToCube(coord.col, coord.row);
      const back = cubeToOffset(cube.q, cube.r);
      expect(back).toEqual(coord);
    }
  });
});

describe('Hex Neighbors', () => {
  it('returns 6 neighbors', () => {
    const neighbors = getNeighbors({ col: 5, row: 5 });
    expect(neighbors).toHaveLength(6);
  });

  it('each neighbor is exactly 1 hex away', () => {
    const center = { col: 10, row: 10 };
    const neighbors = getNeighbors(center);
    for (const n of neighbors) {
      expect(hexDistance(center, n)).toBe(1);
    }
  });

  it('neighbors of neighbors overlap correctly', () => {
    const center = { col: 5, row: 5 };
    const neighbors = getNeighbors(center);
    // Each pair of adjacent neighbors should share the center as a common neighbor
    for (const n of neighbors) {
      const nn = getNeighbors(n);
      const hasCenter = nn.some((h) => h.col === center.col && h.row === center.row);
      expect(hasCenter).toBe(true);
    }
  });

  it('getNeighbor returns consistent results with getNeighbors', () => {
    const center = { col: 20, row: 15 };
    const allNeighbors = getNeighbors(center);
    for (let dir = 0; dir < 6; dir++) {
      const single = getNeighbor(center, dir as 0 | 1 | 2 | 3 | 4 | 5);
      expect(single).toEqual(allNeighbors[dir]);
    }
  });
});

describe('Hex Distance', () => {
  it('distance to self is 0', () => {
    expect(hexDistance({ col: 5, row: 5 }, { col: 5, row: 5 })).toBe(0);
  });

  it('distance to adjacent hex is 1', () => {
    const center = { col: 10, row: 10 };
    const neighbors = getNeighbors(center);
    for (const n of neighbors) {
      expect(hexDistance(center, n)).toBe(1);
    }
  });

  it('is symmetric', () => {
    const a = { col: 10, row: 5 };
    const b = { col: 15, row: 20 };
    expect(hexDistance(a, b)).toBe(hexDistance(b, a));
  });

  it('satisfies triangle inequality', () => {
    const a = { col: 5, row: 5 };
    const b = { col: 10, row: 10 };
    const c = { col: 15, row: 15 };
    expect(hexDistance(a, c)).toBeLessThanOrEqual(hexDistance(a, b) + hexDistance(b, c));
  });
});

describe('Hex Line', () => {
  it('line from hex to itself is just that hex', () => {
    const hex = { col: 5, row: 5 };
    const line = hexLine(hex, hex);
    expect(line).toHaveLength(1);
    expect(line[0]).toEqual(hex);
  });

  it('line length equals distance + 1', () => {
    const a = { col: 5, row: 5 };
    const b = { col: 10, row: 10 };
    const line = hexLine(a, b);
    expect(line.length).toBe(hexDistance(a, b) + 1);
  });

  it('line starts and ends at the correct hexes', () => {
    const a = { col: 3, row: 7 };
    const b = { col: 12, row: 3 };
    const line = hexLine(a, b);
    expect(line[0]).toEqual(a);
    expect(line[line.length - 1]).toEqual(b);
  });

  it('each step in the line is distance 1 from previous', () => {
    const a = { col: 5, row: 5 };
    const b = { col: 15, row: 10 };
    const line = hexLine(a, b);
    for (let i = 1; i < line.length; i++) {
      expect(hexDistance(line[i - 1], line[i])).toBe(1);
    }
  });
});

describe('Hexes in Range', () => {
  it('range 0 returns just the center', () => {
    const result = hexesInRange({ col: 5, row: 5 }, 0);
    expect(result).toHaveLength(1);
  });

  it('range 1 returns 7 hexes (center + 6 neighbors)', () => {
    const result = hexesInRange({ col: 10, row: 10 }, 1);
    expect(result).toHaveLength(7);
  });

  it('range 2 returns 19 hexes', () => {
    const result = hexesInRange({ col: 10, row: 10 }, 2);
    expect(result).toHaveLength(19);
  });

  it('all hexes are within the specified range', () => {
    const center = { col: 10, row: 10 };
    const range = 3;
    const hexes = hexesInRange(center, range);
    for (const hex of hexes) {
      expect(hexDistance(center, hex)).toBeLessThanOrEqual(range);
    }
  });
});

describe('Hex Ring', () => {
  it('ring 0 returns just the center', () => {
    const result = hexRing({ col: 5, row: 5 }, 0);
    expect(result).toHaveLength(1);
  });

  it('ring 1 returns 6 hexes', () => {
    const result = hexRing({ col: 10, row: 10 }, 1);
    expect(result).toHaveLength(6);
  });

  it('ring 2 returns 12 hexes', () => {
    const result = hexRing({ col: 10, row: 10 }, 2);
    expect(result).toHaveLength(12);
  });

  it('all hexes on ring are exactly the specified distance', () => {
    const center = { col: 10, row: 10 };
    const radius = 3;
    const ring = hexRing(center, radius);
    for (const hex of ring) {
      expect(hexDistance(center, hex)).toBe(radius);
    }
  });
});

describe('Arc Determination', () => {
  it('target directly ahead is in forward arc', () => {
    // Heading 0 (east), target to the east
    const origin = { col: 10, row: 10 };
    const target = { col: 15, row: 10 };
    expect(getArc(origin, 0, target)).toBe('forward');
  });

  it('target directly behind is in rear arc', () => {
    const origin = { col: 10, row: 10 };
    const target = { col: 5, row: 10 };
    expect(getArc(origin, 0, target)).toBe('rear');
  });

  it('forward hemisphere includes forward and beam arcs', () => {
    const origin = { col: 10, row: 10 };
    const target = { col: 15, row: 10 };
    expect(getHemisphere(origin, 0, target)).toBe('forward');
    expect(isInForwardHemisphere(origin, 0, target)).toBe(true);
  });

  it('rear hemisphere includes rear and rear beam arcs', () => {
    const origin = { col: 10, row: 10 };
    const target = { col: 5, row: 10 };
    expect(getHemisphere(origin, 0, target)).toBe('rear');
    expect(isInForwardHemisphere(origin, 0, target)).toBe(false);
  });
});

describe('Heading Helpers', () => {
  it('normalizes headings to 0-330 range', () => {
    expect(normalizeHeading(0)).toBe(0);
    expect(normalizeHeading(360)).toBe(0);
    expect(normalizeHeading(-30)).toBe(330);
    expect(normalizeHeading(720)).toBe(0);
    expect(normalizeHeading(90)).toBe(90);
  });

  it('calculates heading difference correctly', () => {
    expect(headingDifference(0, 90)).toBe(90);
    expect(headingDifference(0, 180)).toBe(180);
    expect(headingDifference(0, 330)).toBe(30);
    // 330 and 30 are valid 30-degree increments
    expect(headingDifference(330, 30)).toBe(60);
    expect(headingDifference(30, 330)).toBe(60);
  });

  it('calculates opposite heading', () => {
    expect(oppositeHeading(0)).toBe(180);
    expect(oppositeHeading(90)).toBe(270);
    expect(oppositeHeading(180)).toBe(0);
    expect(oppositeHeading(270)).toBe(90);
  });
});

describe('Altitude Helpers', () => {
  it('altitude indices are in order', () => {
    expect(altitudeIndex('deck')).toBe(0);
    expect(altitudeIndex('low')).toBe(1);
    expect(altitudeIndex('medium')).toBe(2);
    expect(altitudeIndex('high')).toBe(3);
    expect(altitudeIndex('veryHigh')).toBe(4);
  });

  it('altitude difference is absolute', () => {
    expect(altitudeDifference('deck', 'high')).toBe(3);
    expect(altitudeDifference('high', 'deck')).toBe(3);
    expect(altitudeDifference('medium', 'medium')).toBe(0);
  });

  it('isHigherAltitude is correct', () => {
    expect(isHigherAltitude('high', 'low')).toBe(true);
    expect(isHigherAltitude('low', 'high')).toBe(false);
    expect(isHigherAltitude('medium', 'medium')).toBe(false);
  });
});

describe('Validation', () => {
  it('validates hex coordinates within map bounds', () => {
    expect(isValidHex({ col: 0, row: 0 })).toBe(true);
    expect(isValidHex({ col: 79, row: 50 })).toBe(true);
    expect(isValidHex({ col: 40, row: 25 })).toBe(true);
    expect(isValidHex({ col: -1, row: 0 })).toBe(false);
    expect(isValidHex({ col: 80, row: 0 })).toBe(false);
    expect(isValidHex({ col: 0, row: 51 })).toBe(false);
  });

  it('validates play area bounds', () => {
    // RS1: on/north of xx10, on/east of 39xx
    expect(isInPlayArea({ col: 39, row: 10 }, 39, 79, 0, 10)).toBe(true);
    expect(isInPlayArea({ col: 50, row: 5 }, 39, 79, 0, 10)).toBe(true);
    expect(isInPlayArea({ col: 38, row: 5 }, 39, 79, 0, 10)).toBe(false);
    expect(isInPlayArea({ col: 50, row: 11 }, 39, 79, 0, 10)).toBe(false);
  });
});

describe('Line of Sight', () => {
  it('LOS is clear with no mountains between deck-level units', () => {
    const from = { col: 5, row: 5 };
    const to = { col: 8, row: 5 };
    const getTerrain = () => ['land'];
    expect(hasLineOfSight(from, to, 'deck', 'deck', getTerrain)).toBe(true);
  });

  it('LOS is blocked by mountain between deck-level units', () => {
    const from = { col: 5, row: 5 };
    const to = { col: 8, row: 5 };
    const getTerrain = (hex: HexCoord) =>
      hex.col === 7 && hex.row === 5 ? ['mountain'] : ['land'];
    expect(hasLineOfSight(from, to, 'deck', 'deck', getTerrain)).toBe(false);
  });

  it('LOS is not blocked by mountains if not both at deck', () => {
    const from = { col: 5, row: 5 };
    const to = { col: 8, row: 5 };
    const getTerrain = (hex: HexCoord) =>
      hex.col === 7 && hex.row === 5 ? ['mountain'] : ['land'];
    expect(hasLineOfSight(from, to, 'low', 'deck', getTerrain)).toBe(true);
    expect(hasLineOfSight(from, to, 'deck', 'low', getTerrain)).toBe(true);
  });
});
