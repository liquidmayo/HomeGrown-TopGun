import { describe, it, expect } from 'vitest';
import { hexToId, idToHex, HexCoord } from '@engine/state/GameState';

describe('Hex Coordinate System', () => {
  describe('hexToId', () => {
    it('converts hex coords to 4-digit string', () => {
      expect(hexToId({ col: 51, row: 26 })).toBe('5126');
      expect(hexToId({ col: 5, row: 3 })).toBe('0503');
      expect(hexToId({ col: 0, row: 0 })).toBe('0000');
      expect(hexToId({ col: 79, row: 50 })).toBe('7950');
    });

    it('pads single-digit values with zeros', () => {
      expect(hexToId({ col: 1, row: 2 })).toBe('0102');
      expect(hexToId({ col: 9, row: 9 })).toBe('0909');
    });
  });

  describe('idToHex', () => {
    it('parses 4-digit string to hex coords', () => {
      expect(idToHex('5126')).toEqual({ col: 51, row: 26 });
      expect(idToHex('0503')).toEqual({ col: 5, row: 3 });
      expect(idToHex('0000')).toEqual({ col: 0, row: 0 });
      expect(idToHex('7950')).toEqual({ col: 79, row: 50 });
    });
  });

  describe('round-trip', () => {
    it('hexToId and idToHex are inverses', () => {
      const testCoords: HexCoord[] = [
        { col: 0, row: 0 },
        { col: 51, row: 26 },
        { col: 63, row: 2 },
        { col: 79, row: 50 },
        { col: 10, row: 25 },
      ];
      for (const coord of testCoords) {
        expect(idToHex(hexToId(coord))).toEqual(coord);
      }
    });
  });
});
